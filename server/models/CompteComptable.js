const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Compte Comptable.
 * Représente une ligne du plan comptable de l'entreprise (conforme SYSCOHADA).
 */
const compteComptableSchema = new Schema(
  {
    numero: {
      type: String,
      required: [true, 'Le numéro de compte est obligatoire.'],
      unique: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Valide que le numéro de compte est composé de chiffres et a une longueur raisonnable
          return /^[1-9][0-9]*$/.test(v) && v.length >= 2 && v.length <= 10;
        },
        message: props => `${props.value} n'est pas un numéro de compte valide.`
      }
    },
    libelle: {
      type: String,
      required: [true, 'Le libellé du compte est obligatoire.'],
      trim: true,
    },
    classe: {
      type: Number,
      required: true,
      enum: {
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        message: 'La classe comptable doit être entre 1 et 9.'
      },
      description: "Classe comptable selon SYSCOHADA (1-Comptes de ressources durables, 6-Comptes de charges, 7-Comptes de produits...)"
    },
    typeCompte: {
      type: String,
      required: true,
      enum: ['Bilan', 'Résultat', 'Autre'],
      description: "Indique si le compte apparaît au bilan ou au compte de résultat."
    },
    sens: {
      type: String,
      required: true,
      enum: ['Débit', 'Crédit'],
      description: "Sens naturel du compte (un compte de charge augmente au débit, un compte de produit au crédit)."
    },
    estLettrable: {
      type: Boolean,
      default: false,
      description: "Indique si les écritures de ce compte peuvent être lettrées (rapprochées), typiquement les comptes de tiers (401, 411)."
    },
    
    // Pour les comptes de Tiers (Clients/Fournisseurs)
    compteTiers: {
        type: Boolean,
        default: false,
        description: "Marque ce compte comme un compte général de tiers (ex: 411 - CLIENTS)."
    },

    // --- Soldes ---
    // Ces soldes sont mis à jour par des processus de calcul périodiques
    soldeDebit: { type: Number, default: 0 },
    soldeCredit: { type: Number, default: 0 },
    
    // --- Métadonnées ---
    actif: { type: Boolean, default: true },
    estSysteme: {
        type: Boolean,
        default: false,
        description: "Indique si le compte est un compte système non modifiable/supprimable (ex: comptes de TVA)."
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Champ virtuel pour calculer le solde final du compte.
 */
compteComptableSchema.virtual('solde').get(function() {
    if (this.sens === 'Débit') {
        return this.soldeDebit - this.soldeCredit; // Solde débiteur
    }
    return this.soldeCredit - this.soldeDebit; // Solde créditeur
});

/**
 * Middleware pre-save pour déduire automatiquement la classe, le type et le sens.
 * C'est une aide à la saisie qui garantit la cohérence selon les règles SYSCOHADA.
 */
compteComptableSchema.pre('save', function(next) {
    if (this.isModified('numero')) {
        const premiereClasse = parseInt(this.numero.charAt(0));
        this.classe = premiereClasse;

        switch (premiereClasse) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                this.typeCompte = 'Bilan';
                break;
            case 6:
            case 7:
                this.typeCompte = 'Résultat';
                break;
            default:
                this.typeCompte = 'Autre';
        }

        // Définition simplifiée du sens
        if ([2, 3, 6, 8].includes(premiereClasse)) {
            this.sens = 'Débit';
        } else {
            this.sens = 'Crédit';
        }
    }
    next();
});

// Index pour des recherches rapides par numéro
compteComptableSchema.index({ numero: 1 });

const CompteComptable = mongoose.model('CompteComptable', compteComptableSchema);

module.exports = CompteComptable;