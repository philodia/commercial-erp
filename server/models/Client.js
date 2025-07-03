const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Client
 * Représente un client ou un prospect dans le système.
 * Contient toutes les informations pertinentes pour la gestion commerciale et comptable.
 */
const clientSchema = new Schema(
  {
    // --- Informations Générales ---
    nom: {
      type: String,
      required: [true, 'Le nom du client est obligatoire.'],
      trim: true,
    },
    typeClient: {
      type: String,
      enum: ['Particulier', 'Entreprise'],
      required: [true, 'Le type de client est obligatoire.'],
    },
    codeClient: {
      type: String,
      unique: true,
      required: [true, 'Le code client est obligatoire.'],
      uppercase: true,
      trim: true,
    },
    statut: {
      type: String,
      enum: ['Prospect', 'Actif', 'Inactif', 'Bloqué'],
      default: 'Prospect',
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
    
    // --- Informations Commerciales ---
    segmentation: {
      type: String,
      enum: ['A', 'B', 'C', 'Non défini'],
      default: 'Non défini',
      // 'A': Très important, 'B': Important, 'C': Standard
    },
    commercialAttitre: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Référence à l'utilisateur (commercial) en charge
    },

    // --- Informations Fiscales et Comptables (pour entreprises) ---
    ninea: { // Numéro d'Identification National des Entreprises et des Associations
      type: String,
      trim: true,
    },
    registreCommerce: {
      type: String,
      trim: true,
    },
    assujettiTVA: {
      type: Boolean,
      default: true,
    },
    compteComptableAssocie: {
      // Pourrait faire référence à un modèle CompteComptable plus tard
      type: String,
      trim: true,
    },
    
    // --- Informations Financières (calculées dynamiquement) ---
    solde: {
      type: Number,
      default: 0,
      // Le solde du client (positif si le client nous doit de l'argent)
    },
    chiffreAffaires: {
      type: Number,
      default: 0,
    },
    
    // --- Métadonnées ---
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    historiqueInteractions: [
      {
        date: { type: Date, default: Date.now },
        typeInteraction: { type: String, enum: ['Appel', 'Email', 'Réunion', 'Vente', 'Devis'] },
        notes: String,
        realisePar: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  {
    // Ajoute createdAt et updatedAt
    timestamps: true,
  }
);

// --- INDEX ---
// Créer un index sur le nom et le code client pour des recherches plus rapides.
clientSchema.index({ nom: 1, codeClient: 1 });

/**
 * Middleware pre-save pour générer un code client unique si non fourni.
 * Exemple: CLI-20230315-RANDOM
 */
clientSchema.pre('save', async function (next) {
  if (this.isNew && !this.codeClient) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.codeClient = `CLI-${date}-${randomPart}`;
  }
  next();
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;