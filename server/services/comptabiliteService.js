const EcritureComptable = require('../models/EcritureComptable');
const Parametres = require('../models/Parametres');
const mongoose = require('mongoose');

/**
 * @class ComptabiliteService
 * @description Centralise la logique de génération des écritures comptables automatiques.
 */
class ComptabiliteService {

  /**
   * Génère et sauvegarde une écriture comptable.
   * @private
   * @param {object} data - Les données de l'écriture.
   * @returns {Promise<object>} Le document EcritureComptable créé.
   */
  async _creerEcriture(data) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const ecriture = new EcritureComptable(data);
      await ecriture.save({ session }); // Le hook pre-save validera l'équilibre
      
      await session.commitTransaction();
      console.log(`Écriture comptable pour pièce n°${data.numeroPiece} créée avec succès.`);
      return ecriture;
    } catch (error) {
      await session.abortTransaction();
      console.error(`Erreur lors de la création de l'écriture comptable pour la pièce n°${data.numeroPiece}:`, error.message);
      throw error;
    } finally {
        session.endSession();
    }
  }

  /**
   * Comptabilise une facture de vente.
   * @param {object} facture - Le document Mongoose de la facture.
   * @param {string} userId - L'ID de l'utilisateur qui effectue l'action.
   * @returns {Promise<object>} L'écriture comptable générée.
   *
   * Schéma de l'écriture :
   * Débit: 411xxx (Compte Client) - Montant TTC
   * Crédit: 70xxxx (Compte de Ventes) - Montant HT
   * Crédit: 443xxx (Compte de TVA Collectée) - Montant TVA
   */
  async comptabiliserFactureVente(facture, userId) {
    if (facture.comptabilise) {
      throw new Error(`La facture n°${facture.numero} a déjà été comptabilisée.`);
    }

    const params = await Parametres.get();
    if (!params || !params.journalVentesParDefaut) {
      throw new Error("Le journal des ventes par défaut n'est pas configuré dans les paramètres.");
    }
    
    // NOTE: Logique pour trouver les comptes. Pourrait être plus complexe.
    // Ici, on suppose que le client et les produits ont des comptes comptables associés.
    // En fallback, on utilise des comptes généraux des paramètres.
    const compteClient = facture.client.compteComptableAssocie || params.compteClientsDefaut; // A ajouter dans Parametres
    const compteVente = params.compteVentesDefaut; // A ajouter dans Parametres
    const compteTVA = params.compteTVAVenteDefaut; // A ajouter dans Parametres

    if (!compteClient || !compteVente || !compteTVA) {
        throw new Error("Un ou plusieurs comptes comptables par défaut sont manquants pour comptabiliser la vente.");
    }

    const data = {
      numeroPiece: facture.numero,
      dateEcriture: facture.dateEmission,
      journal: params.journalVentesParDefaut,
      libelle: `Facture de vente n°${facture.numero} - Client: ${facture.client.nom}`,
      documentOrigine: {
        documentId: facture._id,
        documentModel: 'Facture',
        documentNumero: facture.numero
      },
      creePar: userId,
      mouvements: [
        // Débit du compte client pour le montant total TTC
        { compte: compteClient, libelle: `Facture n°${facture.numero}`, debit: facture.totalTTC, credit: 0 },
        // Crédit du compte de produits/ventes pour le montant HT
        { compte: compteVente, libelle: `Vente client ${facture.client.nom}`, debit: 0, credit: facture.totalHT },
        // Crédit du compte de TVA collectée
        { compte: compteTVA, libelle: `TVA sur facture n°${facture.numero}`, debit: 0, credit: facture.totalTVA }
      ]
    };
    
    const ecriture = await this._creerEcriture(data);

    // Marquer la facture comme comptabilisée
    facture.comptabilise = true;
    facture.journalComptable = ecriture._id;
    await facture.save();

    return ecriture;
  }
  
  /**
   * Comptabilise un paiement reçu d'un client.
   * @param {object} paiement - Le document Mongoose du paiement.
   * @param {object} factureLiee - La facture que ce paiement règle.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<object>} L'écriture comptable générée.
   *
   * Schéma de l'écriture :
   * Débit: 5xx (Compte de Trésorerie - Banque/Caisse) - Montant du paiement
   * Crédit: 411xxx (Compte Client) - Montant du paiement
   */
  async comptabiliserPaiementClient(paiement, factureLiee, userId) {
    const params = await Parametres.get();
    if (!params || !params.journalTresorerieParDefaut) {
      throw new Error("Le journal de trésorerie par défaut n'est pas configuré.");
    }

    const compteClient = factureLiee.client.compteComptableAssocie || params.compteClientsDefaut;
    const compteTreso = params.compteTresorerieDefaut; // Le compte de la banque/caisse qui reçoit l'argent

    if (!compteClient || !compteTreso) {
      throw new Error("Les comptes comptables par défaut (client/trésorerie) sont manquants.");
    }

    const data = {
      numeroPiece: paiement.numeroPaiement,
      dateEcriture: paiement.datePaiement,
      journal: params.journalTresorerieParDefaut,
      libelle: `Paiement facture n°${factureLiee.numero} - Client: ${factureLiee.client.nom}`,
      documentOrigine: {
        documentId: paiement._id,
        documentModel: 'Paiement',
        documentNumero: paiement.numeroPaiement
      },
      creePar: userId,
      mouvements: [
        // Débit du compte de trésorerie
        { compte: compteTreso, libelle: `Encaissement client ${factureLiee.client.nom}`, debit: paiement.montant, credit: 0 },
        // Crédit du compte client pour solder sa dette
        { compte: compteClient, libelle: `Règlement facture n°${factureLiee.numero}`, debit: 0, credit: paiement.montant },
      ]
    };

    return this._creerEcriture(data);
  }

  // TODO: Implémenter comptabiliserFactureAchat, comptabiliserPaiementFournisseur, etc.
}

module.exports = new ComptabiliteService();