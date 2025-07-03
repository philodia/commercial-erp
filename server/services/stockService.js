const MouvementStock = require('../models/MouvementStock');
const Produit = require('../models/Produit');
const mongoose = require('mongoose');

/**
 * @class StockService
 * @description Centralise toute la logique métier liée à la gestion des stocks.
 * C'est le seul point d'entrée pour modifier l'état du stock.
 */
class StockService {

  /**
   * Crée un mouvement de stock et met à jour la quantité du produit.
   * C'est la méthode de base utilisée par toutes les autres méthodes du service.
   * @private
   * @param {object} data - Les données du mouvement.
   * @param {string} data.produitId - ID du produit.
   * @param {string} data.depotId - ID du dépôt.
   * @param {number} data.quantite - Quantité à mouvementer (négative pour une sortie).
   * @param {string} data.typeMouvement - Le type de mouvement (ex: 'SORTIE_VENTE').
   * @param {object} data.documentLie - Document qui a initié le mouvement.
   * @param {string} data.userId - ID de l'utilisateur réalisant l'opération.
   * @returns {Promise<object>} - Le document MouvementStock créé.
   */
  async _creerMouvement({ produitId, depotId, quantite, typeMouvement, documentLie, userId }) {
    if (!produitId || !depotId || !quantite || !typeMouvement || !documentLie || !userId) {
      throw new Error('Données manquantes pour la création du mouvement de stock.');
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const produit = await Produit.findById(produitId).session(session);
      if (!produit) throw new Error(`Produit avec ID ${produitId} non trouvé.`);
      if (!produit.gestionStock) return null; // Ne rien faire si le produit n'est pas géré en stock

      // 1. Mettre à jour la quantité sur le produit
      // Le stock total et le stock par dépôt sont mis à jour
      produit.quantiteEnStock += quantite;
      const depotStock = produit.stockParDepot.find(d => d.depot.toString() === depotId.toString());
      if (depotStock) {
        depotStock.quantite += quantite;
      } else if (quantite > 0) { // On ajoute le produit au dépôt seulement si c'est une entrée
        produit.stockParDepot.push({ depot: depotId, quantite });
      } else {
        throw new Error(`Tentative de sortie de stock pour un produit non présent dans le dépôt ${depotId}.`);
      }

      // Vérifier que le stock ne devient pas négatif
      if (produit.quantiteEnStock < 0 || depotStock?.quantite < 0) {
        throw new Error(`Stock insuffisant pour le produit "${produit.designation}" dans le dépôt.`);
      }

      await produit.save({ session });
      
      // 2. Créer l'enregistrement d'audit (MouvementStock)
      const mouvement = new MouvementStock({
        produit: produitId,
        depot: depotId,
        quantite,
        typeMouvement,
        documentLie: {
          id: documentLie._id,
          type: documentLie.constructor.modelName,
          numero: documentLie.numero || documentLie.numeroVente || documentLie.numeroAchat,
        },
        coutUnitaire: produit.prixAchat, // Utiliser le prix d'achat actuel comme coût. Pourrait être plus complexe (CUMP).
        valeurMouvement: quantite * produit.prixAchat,
        realisePar: userId,
      });

      const mouvementCree = await mouvement.save({ session });
      
      await session.commitTransaction();
      return mouvementCree;

    } catch (error) {
      await session.abortTransaction();
      console.error("Erreur de transaction du stock:", error.message);
      throw error; // Renvoyer l'erreur pour que le contrôleur puisse la gérer
    } finally {
      session.endSession();
    }
  }

  /**
   * Gère la sortie de stock pour une vente (Bon de Livraison).
   * @param {object} bonLivraison - Le document Mongoose du bon de livraison.
   * @param {string} depotId - L'ID du dépôt de sortie.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  async gererSortieVente(bonLivraison, depotId, userId) {
    console.log(`Gestion de la sortie de stock pour le BL n°${bonLivraison.numero}...`);
    for (const ligne of bonLivraison.lignes) {
      await this._creerMouvement({
        produitId: ligne.produit,
        depotId,
        quantite: -ligne.quantiteLivree, // Quantité négative pour une sortie
        typeMouvement: 'SORTIE_VENTE',
        documentLie: bonLivraison,
        userId,
      });
    }
    console.log(`Sortie de stock pour le BL n°${bonLivraison.numero} terminée.`);
  }

  /**
   * Gère l'entrée de stock pour un achat (Bon de Réception).
   * @param {object} bonReception - Le document Mongoose du bon de réception.
   * @param {string} depotId - L'ID du dépôt d'entrée.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  async gererEntreeAchat(bonReception, depotId, userId) {
    console.log(`Gestion de l'entrée de stock pour la réception n°${bonReception.numero}...`);
    for (const ligne of bonReception.lignes) {
      await this._creerMouvement({
        produitId: ligne.produit,
        depotId,
        quantite: ligne.quantiteRecue, // Quantité positive pour une entrée
        typeMouvement: 'ENTREE_ACHAT',
        documentLie: bonReception,
        userId,
      });
    }
    console.log(`Entrée de stock pour la réception n°${bonReception.numero} terminée.`);
  }

  /**
   * Gère un ajustement de stock suite à un inventaire.
   * @param {string} produitId - L'ID du produit.
   * @param {string} depotId - L'ID du dépôt.
   * @param {number} quantiteReelle - La quantité réellement comptée.
   * @param {object} inventaireDoc - Le document d'inventaire qui justifie l'ajustement.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  async ajusterStockInventaire(produitId, depotId, quantiteReelle, inventaireDoc, userId) {
    const produit = await Produit.findById(produitId);
    if (!produit) throw new Error("Produit non trouvé.");

    const depotStock = produit.stockParDepot.find(d => d.depot.toString() === depotId.toString());
    const quantiteTheorique = depotStock ? depotStock.quantite : 0;
    
    const quantiteAjustement = quantiteReelle - quantiteTheorique;

    if (quantiteAjustement !== 0) {
      console.log(`Ajustement de stock pour ${produit.designation}: ${quantiteAjustement}`);
      await this._creerMouvement({
        produitId,
        depotId,
        quantite: quantiteAjustement,
        typeMouvement: 'AJUSTEMENT_INV',
        documentLie: inventaireDoc,
        userId,
      });
    }
  }

  // TODO: Implémenter gererTransfertStock, gererRetourClient, etc.
}

module.exports = new StockService();