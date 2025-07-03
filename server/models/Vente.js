const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour une ligne individuelle dans une vente.
 * Ce schéma sera imbriqué dans le modèle Vente.
 * Il capture les informations du produit au moment de la vente (snapshot).
 */
const ligneVenteSchema = new Schema({
  produit: { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
  description: { type: String, required: true }, // Copie de la désignation du produit
  quantite: { type: Number, required: true, min: [0.01, 'La quantité doit être positive.'] },
  prixUnitaireHT: { type: Number, required: true }, // Copie du prix au moment de la vente
  tauxTVA: { type: Number, required: true },
  remise: {
    type: { type: String, enum: ['Pourcentage', 'Montant'], default: 'Pourcentage' },
    valeur: { type: Number, default: 0 }
  }
}, {
  _id: false, // Pas d'ID séparé pour les sous-documents, sauf si nécessaire
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals pour les calculs au niveau de la ligne
ligneVenteSchema.virtual('totalLigneHT').get(function() {
  return this.quantite * this.prixUnitaireHT;
});

ligneVenteSchema.virtual('montantRemise').get(function() {
  if (this.remise.type === 'Pourcentage') {
    return this.totalLigneHT * (this.remise.valeur / 100);
  }
  return this.remise.valeur;
});

ligneVenteSchema.virtual('totalLigneApresRemiseHT').get(function() {
  return this.totalLigneHT - this.montantRemise;
});

ligneVenteSchema.virtual('montantTVA').get(function() {
  return this.totalLigneApresRemiseHT * (this.tauxTVA / 100);
});

ligneVenteSchema.virtual('totalLigneTTC').get(function() {
  return this.totalLigneApresRemiseHT + this.montantTVA;
});


/**
 * Schéma de la Vente (ou Commande de Vente).
 * Document central qui lie un client, des produits et des totaux.
 */
const venteSchema = new Schema({
  numeroVente: { type: String, required: true, unique: true, uppercase: true, trim: true },
  dateVente: { type: Date, required: true, default: Date.now },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  vendeur: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  lignes: {
    type: [ligneVenteSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Une vente doit contenir au moins une ligne.']
  },

  // Totaux calculés
  totalHT: { type: Number, default: 0 },
  totalRemise: { type: Number, default: 0 },
  totalTVA: { type: Number, default: 0 },
  totalTTC: { type: Number, default: 0 },

  // Statut et Workflow
  statut: {
    type: String,
    enum: ['Brouillon', 'Confirmée', 'En préparation', 'Expédiée', 'Facturée', 'Annulée'],
    default: 'Brouillon'
  },
  statutPaiement: {
    type: String,
    enum: ['Non payé', 'Partiellement payé', 'Payé'],
    default: 'Non payé'
  },
  montantPaye: { type: Number, default: 0 },

  // Liens avec d'autres documents
  devisLie: { type: Schema.Types.ObjectId, ref: 'Devis' },
  facturesLiees: [{ type: Schema.Types.ObjectId, ref: 'Facture' }],
  bonsLivraisonLies: [{ type: Schema.Types.ObjectId, ref: 'BonLivraison' }],

  // Métadonnées
  notes: { type: String, trim: true },
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

/**
 * Middleware pre-save pour calculer tous les totaux avant de sauvegarder.
 * Garantit l'intégrité des données financières du document.
 */
venteSchema.pre('save', function(next) {
  let totalHT = 0;
  let totalRemise = 0;
  let totalTVA = 0;

  this.lignes.forEach(ligne => {
    totalHT += ligne.totalLigneHT;
    totalRemise += ligne.montantRemise;
    totalTVA += ligne.montantTVA;
  });

  this.totalHT = totalHT;
  this.totalRemise = totalRemise;
  this.totalTVA = totalTVA;
  this.totalTTC = totalHT - totalRemise + totalTVA;

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

const Vente = mongoose.model('Vente', venteSchema);

module.exports = Vente;