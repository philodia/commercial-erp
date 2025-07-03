const Facture = require('../models/Facture');
const Devis = require('../models/Devis');
const Produit = require('../models/Produit');
const Paiement = require('../models/Paiement');
const Achat = require('../models/Achat'); // Ajout pour les dettes fournisseurs
const mongoose = require('mongoose');

// Import des utilitaires
const dateUtils = require('../utils/dateUtils');
const { DOCUMENT_STATUS, PAYMENT_STATUS, USER_ROLES } = require('../utils/constants');

/**
 * @class ReportService
 * @description Génère des rapports et des KPIs en agrégeant les données de la base.
 */
class ReportService {

  /**
   * Calcule les KPIs clés pour le dashboard principal.
   * @param {string | object} period - Période (ex: 'this_month') ou objet {startDate, endDate}.
   * @returns {Promise<object>} Un objet contenant les KPIs.
   */
  async getDashboardKPIs(period) {
    const { startDate, endDate } = dateUtils.getPeriodDates(period);

    // Promise.all permet d'exécuter toutes les requêtes d'agrégation en parallèle pour de meilleures performances.
    const [
      caResult,
      encaissementsResult,
      nouvellesFactures,
      devisSignes,
      devisEmis,
      creancesResult,
      dettesResult,
      valeurStockResult
    ] = await Promise.all([
      // 1. Chiffre d'affaires (basé sur les factures émises)
      Facture.aggregate([
        { $match: { dateEmission: { $gte: startDate, $lte: endDate }, statut: { $nin: [DOCUMENT_STATUS.CANCELLED, DOCUMENT_STATUS.DRAFT] } } },
        { $group: { _id: null, total: { $sum: '$totalHT' } } }
      ]),
      // 2. Montant total encaissé
      Paiement.aggregate([
        { $match: { datePaiement: { $gte: startDate, $lte: endDate }, direction: 'Entrant', statut: 'Validé' } },
        { $group: { _id: null, total: { $sum: '$montant' } } }
      ]),
      // 3. Nombre de nouvelles factures
      Facture.countDocuments({ dateEmission: { $gte: startDate, $lte: endDate } }),
      // 4. Devis signés dans la période
      Devis.countDocuments({ statut: DOCUMENT_STATUS.ACCEPTED, updatedAt: { $gte: startDate, $lte: endDate } }),
      // 5. Devis émis dans la période
      Devis.countDocuments({ dateEmission: { $gte: startDate, $lte: endDate }, statut: { $ne: DOCUMENT_STATUS.DRAFT } }),
      // 6. Créances Clients (ce que les clients nous doivent au total)
      Facture.aggregate([
        { $match: { statut: { $nin: [DOCUMENT_STATUS.PAID, DOCUMENT_STATUS.CANCELLED, DOCUMENT_STATUS.DRAFT] } } },
        { $project: { solde: { $subtract: ['$totalTTC', '$montantPaye'] } } },
        { $group: { _id: null, total: { $sum: '$solde' } } }
      ]),
      // 7. Dettes Fournisseurs (ce que nous devons aux fournisseurs au total)
      Achat.aggregate([
          { $match: { statutPaiement: { $in: [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PARTIALLY_PAID] } } },
          { $project: { solde: { $subtract: ['$totalTTC', '$montantPaye'] } } },
          { $group: { _id: null, total: { $sum: '$solde' } } }
      ]),
      // 8. Valeur totale du stock
      Produit.aggregate([
        { $match: { actif: true, gestionStock: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantiteEnStock', '$prixAchat'] } } } }
      ])
    ]);

    const chiffreAffaires = caResult[0]?.total || 0;
    const totalEncaisse = encaissementsResult[0]?.total || 0;
    const creancesClients = creancesResult[0]?.total || 0;
    const dettesFournisseurs = dettesResult[0]?.total || 0;
    const valeurStock = valeurStockResult[0]?.total || 0;
    const tauxConversion = devisEmis > 0 ? (devisSignes / devisEmis) * 100 : 0;

    return {
      chiffreAffaires,
      totalEncaisse,
      nouvellesFactures,
      creancesClients,
      dettesFournisseurs,
      valeurStock,
      tauxConversion: tauxConversion.toFixed(2),
    };
  }

  /**
   * Génère un rapport sur l'évolution des ventes sur une période, groupé par jour/mois/année.
   * @param {Date} dateDebut
   * @param {Date} dateFin
   * @param {'jour' | 'mois' | 'annee'} groupBy - Période de regroupement.
   * @returns {Promise<Array<object>>} Tableau de données pour un graphique.
   */
  async getRapportEvolutionVentes(dateDebut, dateFin, groupBy = 'jour') {
    let groupFormat;
    switch (groupBy) {
      case 'mois': groupFormat = { year: { $year: '$dateEmission' }, month: { $month: '$dateEmission' } }; break;
      case 'annee': groupFormat = { year: { $year: '$dateEmission' } }; break;
      case 'jour':
      default: groupFormat = { year: { $year: '$dateEmission' }, month: { $month: '$dateEmission' }, day: { $dayOfMonth: '$dateEmission' } };
    }

    const pipeline = [
      { $match: { dateEmission: { $gte: dateDebut, $lte: dateFin }, statut: { $nin: [DOCUMENT_STATUS.CANCELLED, DOCUMENT_STATUS.DRAFT] } } },
      { $group: { _id: groupFormat, totalVentes: { $sum: '$totalHT' } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ];

    return Facture.aggregate(pipeline);
  }

  /**
   * Génère un rapport des meilleurs clients sur une période.
   * @param {Date} dateDebut
   * @param {Date} dateFin
   * @param {number} limit - Nombre de clients à retourner.
   * @returns {Promise<Array<object>>}
   */
  async getRapportTopClients(dateDebut, dateFin, limit = 5) {
    const pipeline = [
      { $match: { dateEmission: { $gte: dateDebut, $lte: dateFin }, statut: { $nin: [DOCUMENT_STATUS.CANCELLED, DOCUMENT_STATUS.DRAFT] } } },
      { $group: { _id: '$client', totalDepense: { $sum: '$totalTTC' } } },
      { $sort: { totalDepense: -1 } },
      { $limit: limit },
      { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'clientInfo' } },
      { $unwind: '$clientInfo' },
      { $project: { _id: 0, clientId: '$_id', nomClient: '$clientInfo.nom', totalDepense: 1 } }
    ];

    return Facture.aggregate(pipeline);
  }

  /**
   * Génère un rapport des produits les plus vendus sur une période.
   * @param {Date} dateDebut
   * @param {Date} dateFin
   * @param {number} limit - Nombre de produits à retourner.
   * @returns {Promise<Array<object>>}
   */
  async getRapportTopProduits(dateDebut, dateFin, limit = 5) {
    const pipeline = [
      { $match: { dateEmission: { $gte: dateDebut, $lte: dateFin }, statut: { $nin: [DOCUMENT_STATUS.CANCELLED, DOCUMENT_STATUS.DRAFT] } } },
      { $unwind: '$lignes' },
      { $group: {
          _id: '$lignes.produit',
          totalQuantiteVendue: { $sum: '$lignes.quantite' },
          chiffreAffaires: { $sum: { $multiply: ['$lignes.quantite', '$lignes.prixUnitaireHT'] } }
      }},
      { $sort: { chiffreAffaires: -1 } },
      { $limit: limit },
      { $lookup: { from: 'produits', localField: '_id', foreignField: '_id', as: 'produitInfo' } },
      { $unwind: '$produitInfo' },
      { $project: { _id: 0, produitId: '$_id', designation: '$produitInfo.designation', reference: '$produitInfo.reference', totalQuantiteVendue: 1, chiffreAffaires: 1 } }
    ];

    return Facture.aggregate(pipeline);
  }
}

module.exports = new ReportService();