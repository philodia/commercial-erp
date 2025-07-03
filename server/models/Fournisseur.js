const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Fournisseur
 * Représente un fournisseur de biens ou de services.
 * Ce modèle est symétrique à celui du Client, mais orienté pour la gestion des achats.
 */
const fournisseurSchema = new Schema(
  {
    // --- Informations Générales ---
    nom: {
      type: String,
      required: [true, 'Le nom du fournisseur est obligatoire.'],
      trim: true,
      unique: true
    },
    codeFournisseur: {
      type: String,
      unique: true,
      required: [true, 'Le code fournisseur est obligatoire.'],
      uppercase: true,
      trim: true,
    },
    statut: {
      type: String,
      enum: ['Potentiel', 'Actif', 'Inactif'],
      default: 'Actif',
    },

    // --- Coordonnées ---
    adresse: {
      rue: { type: String, trim: true },
      ville: { type: String, trim: true },
      codePostal: { type: String, trim: true },
      pays: { type: String, default: 'Sénégal', trim: true },
    },
    telephone: {
      type: String,
      required: [true, 'Le numéro de téléphone est obligatoire.'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Veuillez fournir une adresse email valide.',
      ],
    },
    contactPrincipal: {
      nom: { type: String, trim: true },
      poste: { type: String, trim: true },
      email: { type: String, trim: true },
      telephone: { type: String, trim: true },
    },

    // --- Informations Fiscales et Comptables ---
    ninea: {
      type: String,
      trim: true,
    },
    registreCommerce: {
      type: String,
      trim: true,
    },
    compteComptableAssocie: {
      type: String,
      trim: true,
    },

    // --- Informations Financières ---
    solde: {
      type: Number,
      default: 0,
      // Le solde du fournisseur (positif si nous devons de l'argent au fournisseur)
    },
    conditionsPaiement: {
      type: String,
      trim: true,
      default: '30 jours net', // Ex: 'À la commande', '30 jours fin de mois'
    },
    deviseParDefaut: {
      type: String,
      default: 'XOF', // FCFA
    },

    // --- Évaluations et Historique ---
    evaluations: [
      {
        date: { type: Date, default: Date.now },
        evaluateur: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: Number, min: 1, max: 5 },
        commentaire: String,
      },
    ],
    produitsFournis: [{
        type: Schema.Types.ObjectId,
        ref: 'Produit'
    }],

    // --- Métadonnées ---
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- INDEX ---
fournisseurSchema.index({ nom: 1, codeFournisseur: 1 });

/**
 * Middleware pre-save pour générer un code fournisseur unique si non fourni.
 * Exemple: FOU-20230315-RANDOM
 */
fournisseurSchema.pre('save', async function (next) {
  if (this.isNew && !this.codeFournisseur) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.codeFournisseur = `FOU-${date}-${randomPart}`;
  }
  next();
});

const Fournisseur = mongoose.model('Fournisseur', fournisseurSchema);

module.exports = Fournisseur;