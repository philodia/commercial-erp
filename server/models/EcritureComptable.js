const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour un mouvement comptable individuel (une ligne dans une écriture).
 * Représente soit un débit, soit un crédit sur un compte.
 */
const mouvementComptableSchema = new Schema({
  compte: {
    type: Schema.Types.ObjectId,
    ref: 'CompteComptable',
    required: [true, 'Un compte comptable est obligatoire pour chaque mouvement.']
  },
  libelle: { type: String, required: true, trim: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  // Pour le lettrage des comptes de tiers
  lettrage: { type: String, trim: true, index: true, sparse: true }
}, {
  _id: false,
  validate: [
    // Validation pour s'assurer qu'une ligne est soit un débit, soit un crédit, mais pas les deux.
    function(v) { return (v.debit === 0 && v.credit > 0) || (v.debit > 0 && v.credit === 0); },
    'Un mouvement doit être soit un débit, soit un crédit, mais pas les deux et ne peut être nul.'
  ]
});

/**
 * Schéma de l'Écriture Comptable.
 * Représente une transaction comptable complète, composée de plusieurs mouvements
 * dont la somme des débits doit égaler la somme des crédits.
 */
const ecritureComptableSchema = new Schema({
  numeroPiece: { type: String, required: true, unique: true, description: "Identifiant unique de la pièce justificative (ex: FA-2024-001)" },
  dateEcriture: { type: Date, required: true, default: Date.now, index: true },
  journal: {
    type: Schema.Types.ObjectId,
    ref: 'JournalComptable',
    required: [true, 'L\'écriture doit être associée à un journal.']
  },
  libelle: { type: String, required: true, trim: true, description: "Description générale de l'opération." },
  
  mouvements: {
    type: [mouvementComptableSchema],
    validate: [
      (v) => Array.isArray(v) && v.length >= 2,
      'Une écriture comptable doit contenir au moins deux mouvements (un débit et un crédit).'
    ]
  },
  
  totalDebit: { type: Number, required: true },
  totalCredit: { type: Number, required: true },

  // Référence au document métier qui a généré cette écriture (polymorphique)
  documentOrigine: {
    documentId: { type: Schema.Types.ObjectId, refPath: 'documentOrigine.documentModel' },
    documentModel: { type: String, enum: ['Facture', 'Paiement', 'Achat', 'OperationDiverse'] },
    documentNumero: { type: String }
  },
  
  statut: {
    type: String,
    enum: ['Brouillon', 'Validée', 'Annulée'],
    default: 'Validée'
  },

  // Métadonnées
  validePar: { type: Schema.Types.ObjectId, ref: 'User' },
  creePar: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });


/**
 * Middleware pre-save pour valider l'équilibre de l'écriture.
 * C'est le garant du principe de la partie double.
 */
ecritureComptableSchema.pre('save', function(next) {
  let totalDebit = 0;
  let totalCredit = 0;

  this.mouvements.forEach(m => {
    totalDebit += m.debit || 0;
    totalCredit += m.credit || 0;
  });

  // Arrondir pour éviter les problèmes de précision avec les flottants en JavaScript
  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;

  if (totalDebit !== totalCredit) {
    const error = new Error('L\'écriture n\'est pas équilibrée : Total Débit (' + totalDebit + ') doit être égal au Total Crédit (' + totalCredit + ').');
    return next(error);
  }
  
  if (totalDebit === 0) {
    const error = new Error('Une écriture comptable ne peut pas avoir un total de zéro.');
    return next(error);
  }

  this.totalDebit = totalDebit;
  this.totalCredit = totalCredit;

  next();
});

const EcritureComptable = mongoose.model('EcritureComptable', ecritureComptableSchema);

module.exports = EcritureComptable;