const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Mouvement de Stock.
 * Ce modèle est le journal d'audit immuable de toutes les variations de stock.
 * Chaque document représente une transaction unique (entrée ou sortie).
 */
const mouvementStockSchema = new Schema(
  {
    produit: {
      type: Schema.Types.ObjectId,
      ref: 'Produit',
      required: [true, 'Une référence produit est obligatoire.'],
      index: true, // Indexer pour des recherches rapides par produit
    },
    depot: {
      type: Schema.Types.ObjectId,
      ref: 'Depot',
      required: [true, 'Une référence au dépôt est obligatoire.'],
      index: true, // Indexer pour des recherches rapides par dépôt
    },
    quantite: {
      type: Number,
      required: true,
      validate: {
        validator: function(v) { return v !== 0; },
        message: 'La quantité ne peut pas être zéro.'
      },
      description: "Quantité du mouvement. Positive pour une entrée, négative pour une sortie.",
    },
    typeMouvement: {
      type: String,
      required: true,
      enum: {
        values: [
          'ENTREE_ACHAT',      // Réception d'une commande fournisseur
          'SORTIE_VENTE',      // Expédition d'une commande client
          'AJUSTEMENT_INV',    // Correction suite à un inventaire (positif ou négatif)
          'TRANSFERT_SORTANT', // Transfert vers un autre dépôt
          'TRANSFERT_ENTRANT', // Réception d'un transfert d'un autre dépôt
          'RETOUR_CLIENT',     // Entrée suite à un retour client
          'RETOUR_FOURNISSEUR',// Sortie suite à un retour fournisseur
          'PERTE_CASSE',       // Sortie pour produit endommagé/périmé
          'ENTREE_INITIALE',   // Mise en place du stock initial pour un produit
        ],
        message: 'Le type de mouvement "{VALUE}" n\'est pas supporté.'
      }
    },
    
    // --- Référence au document source ---
    documentLie: {
      id: { type: Schema.Types.ObjectId, required: true },
      type: { type: String, required: true, enum: ['Vente', 'Achat', 'Inventaire', 'RetourClient', 'RetourFournisseur', 'Transfert'] },
      numero: { type: String, required: true, trim: true } // ex: 'FA-2023-001', 'CA-2023-010'
    },
    
    // --- Valorisation du stock ---
    coutUnitaire: {
      type: Number,
      required: [true, 'Le coût unitaire est obligatoire pour valoriser le mouvement.'],
      description: "Le coût du produit au moment du mouvement (généralement le CUMP ou le prix d'achat)."
    },
    valeurMouvement: {
      type: Number,
      description: "Valeur totale du mouvement (quantite * coutUnitaire). Calculé automatiquement."
    },
    
    // --- Métadonnées ---
    realisePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    // On renomme `createdAt` en `dateMouvement` pour plus de clarté
    // On désactive `updatedAt` car un mouvement de stock ne doit pas être modifié.
    timestamps: { createdAt: 'dateMouvement', updatedAt: false },
  }
);

// --- INDEX COMPOSÉS ---
// Très utile pour les rapports de stock pour un produit donné sur une période.
mouvementStockSchema.index({ produit: 1, dateMouvement: -1 });
mouvementStockSchema.index({ depot: 1, dateMouvement: -1 });


/**
 * Middleware pre-save pour :
 * 1. Calculer la valeur totale du mouvement.
 * 2. Mettre à jour le stock dans le modèle Produit correspondant.
 */
mouvementStockSchema.pre('save', async function(next) {
  // S'exécute seulement à la création du document
  if (this.isNew) {
    // 1. Calculer la valeur du mouvement
    this.valeurMouvement = this.quantite * this.coutUnitaire;

    // 2. Mettre à jour le stock dans le modèle Produit
    // On utilise la méthode statique que nous avions définie dans Produit.js
    const Produit = mongoose.model('Produit');
    try {
      await Produit.mettreAJourStock(this.produit, this.depot, this.quantite);
    } catch (error) {
      // Si la mise à jour du stock échoue (ex: stock négatif), on empêche la sauvegarde du mouvement.
      return next(error);
    }
  }
  next();
});

const MouvementStock = mongoose.model('MouvementStock', mouvementStockSchema);

module.exports = MouvementStock;