const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Dépôt.
 * Représente un emplacement physique de stockage des produits (entrepôt principal,
 * boutique, camionnette de livraison, etc.). Ce modèle est essentiel pour la
 * fonctionnalité de gestion de stock multi-dépôts.
 */
const depotSchema = new Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du dépôt est obligatoire.'],
      unique: true,
      trim: true,
      description: "Nom unique et reconnaissable pour le dépôt (ex: 'Entrepôt Central Dakar', 'Boutique Point E')."
    },
    adresse: {
      rue: { type: String, trim: true },
      ville: { type: String, trim: true },
      codePostal: { type: String, trim: true },
      pays: { type: String, default: 'Sénégal', trim: true },
    },
    responsable: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      description: "L'utilisateur responsable de la gestion de ce dépôt."
    },
    estPrincipal: {
      type: Boolean,
      default: false,
      description: "Indique s'il s'agit du dépôt principal/par défaut."
    },
    actif: {
      type: Boolean,
      default: true,
      description: "Permet de désactiver un dépôt sans le supprimer (ex: fermeture temporaire)."
    },
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

/**
 * Middleware pour s'assurer qu'il ne peut y avoir qu'un seul dépôt principal.
 */
depotSchema.pre('save', async function(next) {
    // Si ce dépôt est défini comme principal
    if (this.isModified('estPrincipal') && this.estPrincipal) {
        // Mettre à jour tous les autres dépôts pour qu'ils ne soient plus principaux
        await this.constructor.updateMany({ _id: { $ne: this._id } }, { estPrincipal: false });
    }
    next();
});

const Depot = mongoose.model('Depot', depotSchema);

module.exports = Depot;