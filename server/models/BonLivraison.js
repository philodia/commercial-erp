const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour une ligne individuelle d'un bon de livraison.
 * Se concentre sur la quantité livrée.
 */
const ligneBonLivraisonSchema = new Schema({
  produit: { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
  description: { type: String, required: true },
  quantiteCommandee: { type: Number, required: true },
  quantiteLivree: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(v) {
        // La quantité livrée ne peut pas dépasser la quantité commandée sur cette ligne
        return v <= this.quantiteCommandee;
      },
      message: props => `La quantité livrée (${props.value}) ne peut pas être supérieure à la quantité commandée (${this.quantiteCommandee}).`
    }
  }
}, { _id: false });


/**
 * Schéma du Bon de Livraison (BL).
 * Document qui atteste de la sortie de marchandise du stock et de sa livraison au client.
 * Il déclenche le mouvement de stock sortant.
 */
const bonLivraisonSchema = new Schema({
  numero: { type: String, required: true, unique: true, uppercase: true, trim: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  
  dateLivraison: { type: Date, default: Date.now, required: true },
  
  lignes: {
    type: [ligneBonLivraisonSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'Un bon de livraison doit contenir au moins une ligne.']
  },
  
  statut: {
    type: String,
    enum: ['En préparation', 'Expédié', 'Livré', 'Partiellement livré', 'Retourné'],
    default: 'En préparation'
  },
  
  // --- Informations de livraison ---
  adresseLivraison: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  transporteur: { type: String, trim: true },
  numeroSuivi: { type: String, trim: true }, // Tracking number

  // --- Signature et Réception ---
  recuPar: { type: String, trim: true, description: "Nom de la personne qui a réceptionné la marchandise." },
  dateReception: { type: Date },
  signatureURL: { type: String, description: "URL vers l'image de la signature du client." },
  
  // --- Liens ---
  venteLiee: { type: Schema.Types.ObjectId, ref: 'Vente', required: true },
  factureLiee: { type: Schema.Types.ObjectId, ref: 'Facture' },

  // --- Métadonnées ---
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, trim: true },
  
  // --- Stock ---
  mouvementStockCree: { type: Boolean, default: false, description: "Indique si le mouvement de stock a déjà été généré pour ce BL." }

}, { timestamps: true });

// Index
bonLivraisonSchema.index({ numero: 1 });
bonLivraisonSchema.index({ client: 1, dateLivraison: -1 });
bonLivraisonSchema.index({ venteLiee: 1 });

const BonLivraison = mongoose.model('BonLivraison', bonLivraisonSchema);

module.exports = BonLivraison;