const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Paiement.
 * Enregistre toute transaction financière entrante (d'un client) ou
 * sortante (vers un fournisseur).
 */
const paiementSchema = new Schema(
  {
    numeroPaiement: { type: String, required: true, unique: true, uppercase: true, trim: true },
    datePaiement: { type: Date, required: true, default: Date.now },
    montant: {
      type: Number,
      required: [true, 'Le montant du paiement est obligatoire.'],
      min: [0.01, 'Le montant doit être positif.']
    },
    devise: { type: String, required: true, default: 'XOF' },
    methodePaiement: {
      type: String,
      required: true,
      enum: ['Virement bancaire', 'Chèque', 'Espèces', 'Carte bancaire', 'Orange Money', 'Wave', 'Autre']
    },
    direction: {
      type: String,
      required: true,
      enum: ['Entrant', 'Sortant'],
      description: "Entrant pour un paiement de client, Sortant pour un paiement à un fournisseur."
    },

    // --- Association Polymorphique ---
    // Lie le paiement au document qu'il règle (ex: une Facture ou un Achat)
    documentConcerne: {
      documentId: {
        type: Schema.Types.ObjectId,
        required: true,
        // `refPath` indique à Mongoose de chercher le nom du modèle dans le champ 'documentModel'
        refPath: 'documentConcerne.documentModel'
      },
      documentModel: {
        type: String,
        required: true,
        enum: ['Facture', 'Achat'] // Les modèles qui peuvent recevoir des paiements
      },
      documentNumero: { type: String, required: true } // Numéro lisible du document (ex: FA-2024-001)
    },
    
    statut: {
      type: String,
      enum: ['En attente', 'Validé', 'Annulé', 'Échoué'],
      default: 'Validé'
    },
    
    // --- Métadonnées ---
    referenceExterne: { type: String, trim: true, description: "Référence de transaction, numéro de chèque, etc." },
    notes: { type: String, trim: true },
    enregistrePar: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// --- LOGIQUE MÉTIER (HOOKS) ---

// Fonction pour mettre à jour le solde du document lié (Facture ou Achat)
const updateDocumentSolde = async (doc) => {
    if (!doc || doc.statut !== 'Validé') return; // N'agir que pour les paiements validés

    const modelName = doc.documentConcerne.documentModel;
    const model = mongoose.model(modelName);
    const documentId = doc.documentConcerne.documentId;

    // Recalculer le total de tous les paiements validés pour ce document
    const paiements = await mongoose.model('Paiement').find({ 
      'documentConcerne.documentId': documentId,
      'statut': 'Validé'
    });
    
    const totalPaye = paiements.reduce((acc, p) => acc + p.montant, 0);

    // Mettre à jour le document et le sauvegarder
    // La sauvegarde déclenchera le hook pre-save du modèle lié (Facture ou Achat)
    // qui mettra à son tour à jour son propre statut ('Payé', 'Partiellement payé'...)
    await model.findByIdAndUpdate(documentId, { montantPaye: totalPaye });
};


/**
 * Middleware post-save: Après avoir sauvegardé un paiement, met à jour
 * le montant payé sur la facture ou l'achat correspondant.
 */
paiementSchema.post('save', async function() {
    // `this` est le document Paiement qui vient d'être sauvegardé
    await updateDocumentSolde(this);
});

/**
 * Middleware post-remove: Si un paiement est supprimé, il faut aussi
 * recalculer le solde du document lié.
 */
paiementSchema.post('remove', async function() {
    await updateDocumentSolde(this);
});

// Index
paiementSchema.index({ 'documentConcerne.documentId': 1 });

const Paiement = mongoose.model('Paiement', paiementSchema);

module.exports = Paiement;