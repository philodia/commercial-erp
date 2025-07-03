const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Journal Comptable.
 * Représente un "livre" où sont enregistrées les écritures comptables
 * de même nature (Ventes, Achats, Banque, Opérations Diverses).
 */
const journalComptableSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, 'Le code du journal est obligatoire.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [5, 'Le code ne peut pas dépasser 5 caractères.'],
      description: "Code mnémonique pour le journal (ex: 'VT' pour Ventes, 'AC' pour Achats, 'BQ1' pour Banque 1)."
    },
    libelle: {
      type: String,
      required: [true, 'Le libellé du journal est obligatoire.'],
      trim: true,
      description: "Nom complet et descriptif du journal."
    },
    type: {
      type: String,
      required: true,
      enum: ['Vente', 'Achat', 'Trésorerie', 'Opérations diverses'],
      description: "Nature des écritures contenues dans le journal."
    },
    
    // Compte de contrepartie par défaut pour les journaux de trésorerie
    compteContrepartie: {
      type: Schema.Types.ObjectId,
      ref: 'CompteComptable',
      description: "Compte de trésorerie (ex: 571 - Caisse) ou de banque (ex: 521) associé."
    },

    // Séquence pour la numérotation des pièces
    sequence: {
        type: Number,
        default: 1,
        description: "Prochain numéro à utiliser pour les écritures de ce journal."
    },

    // Métadonnées
    actif: {
      type: Boolean,
      default: true,
    },
    estSysteme: {
        type: Boolean,
        default: false,
        description: "Indique si le journal est un journal système non modifiable/supprimable."
    }
  },
  { timestamps: true }
);

// Index
journalComptableSchema.index({ code: 1 });

const JournalComptable = mongoose.model('JournalComptable', journalComptableSchema);

module.exports = JournalComptable;