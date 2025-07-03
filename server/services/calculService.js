// On importe les briques de calcul de base depuis le fichier d'utilitaires
const { 
    roundFinancial, 
    calculateTaxAmount, 
    calculateDiscountAmount, 
    calculateMarginPercentage // Au cas où on en aurait besoin plus tard
} = require('../utils/calculations');


/**
 * @class CalculService
 * @description Fournit des fonctions utilitaires pour les calculs financiers et commerciaux récurrents.
 * Ce service est "stateless" et s'appuie sur utils/calculations pour les opérations de base.
 */
class CalculService {

  /**
   * Calcule les totaux d'un document commercial (devis, facture, etc.) à partir de ses lignes.
   * @param {Array<object>} lignes - Le tableau de lignes du document.
   * @returns {object} Un objet contenant les totaux : { totalHT, totalRemise, totalTVA, totalTTC }.
   */
  calculerTotauxDocument(lignes) {
    if (!lignes || !Array.isArray(lignes)) {
      return { totalHT: 0, totalRemise: 0, totalTVA: 0, totalTTC: 0 };
    }

    // On utilise .reduce pour agréger les totaux, en appelant nos fonctions de calcul utilitaires
    const totaux = lignes.reduce((acc, ligne) => {
      const totalLigneHT = roundFinancial((ligne.quantite || 0) * (ligne.prixUnitaireHT || 0));
      
      const montantRemiseLigne = calculateDiscountAmount(
        totalLigneHT, 
        ligne.remise?.valeur || 0, 
        ligne.remise?.type
      );
      
      const totalLigneApresRemiseHT = totalLigneHT - montantRemiseLigne;
      
      const montantTVALigne = calculateTaxAmount(
        totalLigneApresRemiseHT, 
        ligne.tauxTVA || 0
      );
      
      acc.totalHT += totalLigneHT;
      acc.totalRemise += montantRemiseLigne;
      acc.totalTVA += montantTVALigne;
      
      return acc;
    }, { totalHT: 0, totalRemise: 0, totalTVA: 0 });

    // Calcul final du TTC et arrondi de toutes les valeurs
    const totalTTC = totaux.totalHT - totaux.totalRemise + totaux.totalTVA;

    return {
        totalHT: roundFinancial(totaux.totalHT),
        totalRemise: roundFinancial(totaux.totalRemise),
        totalTVA: roundFinancial(totaux.totalTVA),
        totalTTC: roundFinancial(totalTTC),
    };
  }

  /**
   * Calcule le solde restant dû sur un document payable.
   * @param {number} totalTTC - Le montant total du document.
   * @param {number} montantPaye - Le montant déjà payé.
   * @returns {number} Le solde restant.
   */
  calculerSoldeRestant(totalTTC, montantPaye) {
    const solde = (totalTTC || 0) - (montantPaye || 0);
    return roundFinancial(solde);
  }

  /**
   * Applique un paiement à un ensemble de factures selon une stratégie (ex: les plus anciennes d'abord).
   * @param {number} montantPaiement - Le montant total du paiement à répartir.
   * @param {Array<object>} factures - Un tableau de factures impayées, triées par ordre de priorité.
   * @returns {object} Un objet contenant la répartition et l'éventuel excédent.
   */
  repartirPaiementSurFactures(montantPaiement, factures) {
    let montantRestantAPlacer = roundFinancial(montantPaiement);
    const repartition = [];

    for (const facture of factures) {
      if (montantRestantAPlacer <= 0) break;
      
      const soldeFacture = this.calculerSoldeRestant(facture.totalTTC, facture.montantPaye);

      if (soldeFacture > 0) {
        const montantAAppliquer = roundFinancial(Math.min(montantRestantAPlacer, soldeFacture));
        
        repartition.push({
          factureId: facture._id,
          factureNumero: facture.numero,
          montantApplique: montantAAppliquer
        });
        
        montantRestantAPlacer = roundFinancial(montantRestantAPlacer - montantAAppliquer);
      }
    }
    
    const excedent = montantRestantAPlacer > 0 ? montantRestantAPlacer : 0;
    if (excedent > 0) {
        console.warn(`Un excédent de paiement de ${excedent} n'a pas pu être réparti.`);
    }

    return { repartition, excedent };
  }

  /**
   * Calcule le Coût Unitaire Moyen Pondéré (CUMP) d'un produit après une nouvelle entrée.
   * @param {number} stockInitialQuantite - Quantité en stock avant l'entrée.
   * @param {number} stockInitialCoutTotal - Valeur totale du stock avant l'entrée (Qté * CUMP précédent).
   * @param {number} entreeQuantite - Quantité de la nouvelle entrée.
   * @param {number} entreeCoutUnitaire - Coût unitaire de la nouvelle entrée.
   * @returns {number} Le nouveau CUMP.
   */
  calculerNouveauCump(stockInitialQuantite, stockInitialCoutTotal, entreeQuantite, entreeCoutUnitaire) {
    const nouveauStockQuantite = (stockInitialQuantite || 0) + (entreeQuantite || 0);
    if (nouveauStockQuantite === 0) {
        return 0;
    }
    
    const entreeCoutTotal = (entreeQuantite || 0) * (entreeCoutUnitaire || 0);
    const nouveauCoutTotal = (stockInitialCoutTotal || 0) + entreeCoutTotal;
    
    const nouveauCump = nouveauCoutTotal / nouveauStockQuantite;
    
    return roundFinancial(nouveauCump);
  }
}

module.exports = new CalculService();