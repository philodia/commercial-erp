const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ligneVenteSchema } = require('./Vente'); // On pourrait réutiliser le schéma de ligne de Vente si identique

/**
 * Schéma pour une ligne individuelle dans une facture.
 * C'est un "snapshot" des données au moment de la facturation.
 * Pour la simplicité et la découplage, on le redéfinit ici, même s'il est similaire à ligneVenteSchema.
 */
const ligneFactureSchema = new Schema({
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

// Ajout des mêmes virtuals que pour ligneVenteSchema pour la cohérence
ligneFactureSchema.virtual('totalLigneHT').get(function() { return this.quantite * this.prixUnitaireHT; });
ligneFactureSchema.virtual('montantRemise').get(function() {
  if (this.remise.type === 'Pourcentage') { return this.totalLigneHT * (this.remise.valeur / 100); }
  return this.remise.valeur;
});
ligneFactureSchema.virtual('totalLigneApresRemiseHT').get(function() { return this.totalLigneHT - this.montantRemise; });
ligneFactureSchema.virtual('montantTVA').get(function() { return this.totalLigneApresRemiseHT * (this.tauxTVA / 100); });
ligneFactureSchema.virtual('totalLigneTTC').get(function() { return this.totalLigneApresRemiseHT + this.montantTVA; });


/**
 * Schéma de la Facture.
 * Document légal et comptable finalisant une transaction de vente.
 */
const factureSchema = new Schema({
  numero: { type: String, unique: true, required: true, uppercase: true, trim: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  
  dateEmission: { type: Date, default: Date.now, required: true },
  dateEcheance: { type: Date, required: true },
  
  lignes: {
    type: [ligneFactureSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Une facture doit contenir au moins une ligne.']
  },

  // --- Totaux et Paiement ---
  totalHT: { type: Number, required: true },
  totalRemise: { type: Number, required: true, default: 0 },
  totalTVA: { type: Number, required: true },
  totalTTC: { type: Number, required: true },
  montantPaye: { type: Number, default: 0 },
  
  statut: { 
    type: String, 
    enum: ['Brouillon', 'Envoyée', 'Partiellement payée', 'Payée', 'En retard', 'Annulée'],
    default: 'Brouillon' 
  },
  
  // --- Informations complémentaires ---
  modePaiement: { type: String, trim: true },
  conditionsPaiement: { type: String, default: 'Paiement à réception' },
  notes: { type: String, trim: true },
  mentionsLegales: { type: String, default: "TVA non applicable, art. 293 B du CGI (pour auto-entrepreneurs, à adapter)" },

  // --- Liens et Comptabilité ---
  venteLiee: { type: Schema.Types.ObjectId, ref: 'Vente' },
  devisLie: { type: Schema.Types.ObjectId, ref: 'Devis' },
  paiementsLies: [{ type: Schema.Types.ObjectId, ref: 'Paiement' }], // Futur modèle Paiement
  
  comptabilise: { type: Boolean, default: false, description: "Indique si la facture a été passée en écriture comptable." },
  journalComptable: { type: Schema.Types.ObjectId, ref: 'JournalComptable' }, // Futur modèle

  // --- Métadonnées ---
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

/**
 * Middleware pre-save pour calculer les totaux et mettre à jour le statut.
 */
factureSchema.pre('save', function(next) {
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

  // Mise à jour du statut de paiement (sauf si annulée)
  if (this.statut !== 'Annulée') {
    if (this.montantPaye >= this.totalTTC) {
      this.statut = 'Payée';
    } else if (this.montantPaye > 0 && this.montantPaye < this.totalTTC) {
      this.statut = 'Partiellement payée';
    } else if (this.dateEcheance && this.dateEcheance < new Date()) {
        this.statut = 'En retard';
    } else if (this.statut === 'Brouillon') {
        // Reste en brouillon si pas encore envoyé
    } else {
        this.statut = 'Envoyée';
    }
  }

  next();
});

// Index pour des recherches rapides par numéro ou par client
factureSchema.index({ numero: 1 });
factureSchema.index({ client: 1, dateEmission: -1 });

const Facture = mongoose.model('Facture', factureSchema);

module.exports = Facture;