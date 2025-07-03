const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma de l'Exercice Comptable.
 * Définit une période fiscale et comptable, généralement d'un an,
 * au sein de laquelle les transactions sont enregistrées et les rapports financiers générés.
 */
const exerciceSchema = new Schema(
  {
    libelle: {
      type: String,
      required: [true, 'Le libellé de l\'exercice est obligatoire (ex: "Exercice 2024").'],
      unique: true,
      trim: true,
    },
    dateDebut: {
      type: Date,
      required: [true, 'La date de début est obligatoire.'],
      unique: true, // On ne peut pas avoir deux exercices qui commencent à la même date.
    },
    dateFin: {
      type: Date,
      required: [true, 'La date de fin est obligatoire.'],
      unique: true, // On ne peut pas avoir deux exercices qui finissent à la même date.
    },
    statut: {
      type: String,
      required: true,
      enum: ['Ouvert', 'Clôturé'],
      default: 'Ouvert',
      description: "Un exercice 'Ouvert' accepte de nouvelles écritures. Un exercice 'Clôturé' est verrouillé."
    },
    
    // --- Champs pour le processus de clôture ---
    cloturePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dateCloture: {
      type: Date,
    },
    resultatExercice: {
        type: Number,
        default: 0,
        description: "Bénéfice ou perte de l'exercice, calculé au moment de la clôture."
    },

    // Métadonnées
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { 
    timestamps: true,
    validateBeforeSave: true,
  }
);


/**
 * Validation pour s'assurer que la date de fin est postérieure à la date de début.
 */
exerciceSchema.pre('validate', function(next) {
    if (this.dateFin <= this.dateDebut) {
        this.invalidate('dateFin', 'La date de fin doit être postérieure à la date de début.', this.dateFin);
    }
    next();
});

/**
 * Middleware pour s'assurer qu'il ne peut y avoir qu'un seul exercice ouvert à la fois (optionnel mais recommandé).
 */
exerciceSchema.pre('save', async function(next) {
    if (this.isModified('statut') && this.statut === 'Ouvert') {
        // S'assurer que tous les autres exercices sont clôturés
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, statut: 'Ouvert' },
            { statut: 'Clôturé' }
        );
    }
    next();
});


// Index pour une recherche rapide par dates
exerciceSchema.index({ dateDebut: 1, dateFin: 1 });

const Exercice = mongoose.model('Exercice', exerciceSchema);

module.exports = Exercice;