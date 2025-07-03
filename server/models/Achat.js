const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour une ligne individuelle dans un achat.
 * Symétrique à ligneVenteSchema.
 */
const ligneAchatSchema = new Schema({
  produit: { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
  description: { type: String, required: true },
  quantite: { type: Number, required: true, min: [0.01, 'La quantité doit être positive.'] },
  prixUnitaireHT: { type: Number, required: true }, // Prix d'achat convenu
  tauxTVA: { type: Number, required: true },
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals pour les calculs au niveau de la ligne
ligneAchatSchema.virtual('totalLigneHT').get(function() {
  return this.quantite * this.prixUnitaireHT;
});

ligneAchatSchema.virtual('montantTVA').get(function() {
  return this.totalLigneHT * (this.tauxTVA / 100);
});

ligneAchatSchema.virtual('totalLigneTTC').get(function() {
  return this.totalLigneHT + this.montantTVA;
});


/**
 * Schéma de l'Achat (ou Commande d'Achat).
 * Document qui formalise une commande auprès d'un fournisseur.
 */
const achatSchema = new Schema({
  numeroAchat: { type: String, required: true, unique: true, uppercase: true, trim: true },
  dateAchat: { type: Date, required: true, default: Date.now },
  dateLivraisonAttendue: { type: Date },
  
  fournisseur: { type: Schema.Types.ObjectId, ref: 'Fournisseur', required: true },
  acheteur: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // L'utilisateur qui a passé la commande
  
  lignes: {
    type: [ligneAchatSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Un achat doit contenir au moins une ligne.']
  },

  // Totaux calculés
  totalHT: { type: Number, default: 0 },
  totalTVA: { type: Number, default: 0 },
  totalTTC: { type: Number, default: 0 },

  // Statut et Workflow
  statut: {
    type: String,
    enum: ['Brouillon', 'Commandé', 'Partiellement reçu', 'Reçu', 'Facturé', 'Annulé'],
    default: 'Brouillon'
  },
  statutPaiement: {
    type: String,
    enum: ['Non payé', 'Partiellement payé', 'Payé'],
    default: 'Non payé'
  },
  montantPaye: { type: Number, default: 0 },

  // Liens avec d'autres documents
  facturesFournisseurLiees: [{ type: Schema.Types.ObjectId, ref: 'FactureFournisseur' }], // Futur modèle
  receptionsLiees: [{ type: Schema.Types.ObjectId, ref: 'BonReception' }], // Futur modèle

  // Métadonnées
  notes: { type: String, trim: true },
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

/**
 * Middleware pre-save pour calculer tous les totaux avant de sauvegarder.
 */
achatSchema.pre('save', function(next) {
  let totalHT = 0;
  let totalTVA = 0;

  this.lignes.forEach(ligne => {
    totalHT += ligne.totalLigneHT;
    totalTVA += ligne.montantTVA;
  });

  this.totalHT = totalHT;
  this.totalTVA = totalTVA;
  this.totalTTC = totalHT + totalTVA;

  // Mise à jour du statut de paiement
  if (this.montantPaye >= this.totalTTC) {
      this.statutPaiement = 'Payé';
  } else if (this.montantPaye > 0 && this.montantPaye < this.totalTTC) {
      this.statutPaiement = 'Partiellement payé';
  } else {
      this.statutPaiement = 'Non payé';
  }

  next();
});

const Achat = mongoose.model('Achat', achatSchema);

module.exports = Achat;