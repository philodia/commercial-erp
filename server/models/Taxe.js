const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma de la Taxe.
 * Permet de définir les différents types et taux de taxes applicables
 * dans l'application, principalement la TVA.
 * La gestion centralisée des taxes facilite les mises à jour réglementaires.
 */
const taxeSchema = new Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom de la taxe est obligatoire (ex: "TVA Taux Normal").'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Le code de la taxe est obligatoire (ex: "TVA-18").'],
      unique: true,
      uppercase: true,
      trim: true
    },
    taux: {
      type: Number,
      required: [true, 'Le taux de la taxe est obligatoire.'],
      min: [0, 'Le taux ne peut pas être négatif.'],
      description: "Le taux de la taxe en pourcentage (ex: 18 pour 18%)."
    },
    description: {
      type: String,
      trim: true,
    },
    
    // Compte comptable associé pour la TVA collectée/déductible
    compteComptable: {
        type: Schema.Types.ObjectId,
        ref: 'CompteComptable',
        required: [true, 'Un compte comptable doit être associé à la taxe.'],
        description: "Compte de TVA à utiliser lors de la comptabilisation (ex: 443 - État, TVA facturée)."
    },

    estParDefaut: {
      type: Boolean,
      default: false,
      description: "Indique s'il s'agit du taux de TVA par défaut à appliquer sur les nouveaux produits."
    },
    actif: {
      type: Boolean,
      default: true
    },
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  },
  { timestamps: true }
);

/**
 * Middleware pour s'assurer qu'il ne peut y avoir qu'une seule taxe par défaut.
 */
taxeSchema.pre('save', async function(next) {
    if (this.isModified('estParDefaut') && this.estParDefaut) {
        await this.constructor.updateMany({ _id: { $ne: this._id } }, { estParDefaut: false });
    }
    next();
});

// Index
taxeSchema.index({ code: 1 });


const Taxe = mongoose.model('Taxe', taxeSchema);

module.exports = Taxe;