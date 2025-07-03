const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour une ligne individuelle dans un bon de commande.
 * Identique à la ligne d'achat.
 */
const ligneBonCommandeSchema = new Schema({
  produit: { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
  description: { type: String, required: true },
  quantite: { type: Number, required: true, min: [0.01, 'La quantité doit être positive.'] },
  prixUnitaireHT: { type: Number, required: true }, // Prix d'achat convenu
  tauxTVA: { type: Number, required: true },
  dateLivraisonSouhaitee: { type: Date }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals pour les calculs de ligne
ligneBonCommandeSchema.virtual('totalLigneHT').get(function() { return this.quantite * this.prixUnitaireHT; });
ligneBonCommandeSchema.virtual('montantTVA').get(function() { return this.totalLigneHT * (this.tauxTVA / 100); });
ligneBonCommandeSchema.virtual('totalLigneTTC').get(function() { return this.totalLigneHT + this.montantTVA; });

/**
 * Schéma du Bon de Commande (Purchase Order).
 * Document formalisant une commande auprès d'un fournisseur.
 * NOTE: Ce modèle est structurellement très similaire à Achat.js. Dans certains ERP,
 * Achat.js et BonCommande.js sont fusionnés en un seul modèle avec différents statuts.
 */
const bonCommandeSchema = new Schema({
  numero: { type: String, required: true, unique: true, uppercase: true, trim: true },
  fournisseur: { type: Schema.Types.ObjectId, ref: 'Fournisseur', required: true },
  
  dateCommande: { type: Date, required: true, default: Date.now },
  dateLivraisonAttendue: { type: Date },
  
  lignes: {
    type: [ligneBonCommandeSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Un bon de commande doit contenir au moins une ligne.']
  },

  // --- Totaux ---
  totalHT: { type: Number, required: true, default: 0 },
  totalTVA: { type: Number, required: true, default: 0 },
  totalTTC: { type: Number, required: true, default: 0 },

  // --- Statut et Workflow ---
  statut: {
    type: String,
    enum: ['Brouillon', 'Envoyé au fournisseur', 'Confirmé par fournisseur', 'Partiellement reçu', 'Reçu en totalité', 'Annulé'],
    default: 'Brouillon'
  },

  // --- Adresses et autres informations ---
  adresseLivraison: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  adresseFacturation: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  conditionsPaiement: { type: String, trim: true },
  notes: { type: String, trim: true },

  // --- Liens ---
  // achatLie: { type: Schema.Types.ObjectId, ref: 'Achat' }, // Si on considère Achat comme une "demande d'achat" interne
  receptionsLiees: [{ type: Schema.Types.ObjectId, ref: 'BonLivraison' }], // Bon de livraison du fournisseur

  // --- Métadonnées ---
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
}, { timestamps: true });

/**
 * Middleware pre-save pour calculer tous les totaux.
 */
bonCommandeSchema.pre('save', function(next) {
  let totalHT = 0, totalTVA = 0;
  this.lignes.forEach(ligne => {
    totalHT += ligne.totalLigneHT;
    totalTVA += ligne.montantTVA;
  });
  this.totalHT = totalHT;
  this.totalTVA = totalTVA;
  this.totalTTC = totalHT + totalTVA;
  next();
});

// Index
bonCommandeSchema.index({ numero: 1 });
bonCommandeSchema.index({ fournisseur: 1, dateCommande: -1 });

const BonCommande = mongoose.model('BonCommande', bonCommandeSchema);

module.exports = BonCommande;