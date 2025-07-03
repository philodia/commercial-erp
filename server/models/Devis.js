const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour une ligne individuelle dans un devis.
 * C'est une copie exacte de la structure d'une ligne de vente ou de facture,
 * assurant la cohérence lors de la conversion.
 */
const ligneDevisSchema = new Schema({
  produit: { type: Schema.Types.ObjectId, ref: 'Produit' },
  description: { type: String, required: true },
  quantite: { type: Number, required: true, min: [0.01, 'La quantité doit être positive.'] },
  prixUnitaireHT: { type: Number, required: true },
  tauxTVA: { type: Number, required: true },
  remise: {
    type: { type: String, enum: ['Pourcentage', 'Montant'], default: 'Pourcentage' },
    valeur: { type: Number, default: 0 }
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ajout des virtuals pour les calculs de ligne
ligneDevisSchema.virtual('totalLigneHT').get(function() { return this.quantite * this.prixUnitaireHT; });
ligneDevisSchema.virtual('montantRemise').get(function() {
  if (this.remise.type === 'Pourcentage') { return this.totalLigneHT * (this.remise.valeur / 100); }
  return this.remise.valeur;
});
ligneDevisSchema.virtual('totalLigneApresRemiseHT').get(function() { return this.totalLigneHT - this.montantRemise; });
ligneDevisSchema.virtual('montantTVA').get(function() { return this.totalLigneApresRemiseHT * (this.tauxTVA / 100); });
ligneDevisSchema.virtual('totalLigneTTC').get(function() { return this.totalLigneApresRemiseHT + this.montantTVA; });


/**
 * Schéma du Devis (Proposition Commerciale).
 * Document initial du cycle de vente, non contraignant d'un point de vue comptable.
 */
const devisSchema = new Schema({
  numero: { type: String, unique: true, required: true, uppercase: true, trim: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  
  dateEmission: { type: Date, default: Date.now, required: true },
  dateValidite: { type: Date, required: true }, // Date jusqu'à laquelle l'offre est valable
  
  objet: { type: String, trim: true, required: [true, 'L\'objet du devis est obligatoire.'] },

  lignes: {
    type: [ligneDevisSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Un devis doit contenir au moins une ligne.']
  },

  // --- Totaux ---
  totalHT: { type: Number, required: true },
  totalRemise: { type: Number, required: true, default: 0 },
  totalTVA: { type: Number, required: true },
  totalTTC: { type: Number, required: true },
  
  statut: { 
    type: String, 
    enum: ['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Expiré', 'Annulé'],
    default: 'Brouillon' 
  },
  
  // --- Informations complémentaires ---
  conditionsPaiement: { type: String },
  notes: { type: String, trim: true },

  // --- Liens avec les documents suivants ---
  venteLiee: { type: Schema.Types.ObjectId, ref: 'Vente' },
  factureLiee: { type: Schema.Types.ObjectId, ref: 'Facture' },

  // --- Métadonnées ---
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

/**
 * Middleware pre-save pour calculer les totaux.
 */
devisSchema.pre('save', function(next) {
  // Calcul des totaux
  let totalHT = 0, totalRemise = 0, totalTVA = 0;
  this.lignes.forEach(ligne => {
    totalHT += ligne.totalLigneHT;
    totalRemise += ligne.montantRemise;
    totalTVA += ligne.montantTVA;
  });
  this.totalHT = totalHT;
  this.totalRemise = totalRemise;
  this.totalTVA = totalTVA;
  this.totalTTC = totalHT - totalRemise + totalTVA;

  // Mise à jour automatique du statut si expiré
  if (this.statut !== 'Accepté' && this.statut !== 'Refusé' && this.statut !== 'Annulé') {
    if (this.dateValidite && this.dateValidite < new Date()) {
        this.statut = 'Expiré';
    }
  }

  next();
});

// Index pour des recherches rapides
devisSchema.index({ numero: 1 });
devisSchema.index({ client: 1, dateEmission: -1 });

const Devis = mongoose.model('Devis', devisSchema);

module.exports = Devis;