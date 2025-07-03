const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma de la Catégorie
 * Permet de classer et d'organiser les produits et services.
 * Une catégorie peut avoir une catégorie parente pour créer une hiérarchie (arborescence).
 */
const categorieSchema = new Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom de la catégorie est obligatoire.'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Permet de créer une hiérarchie de catégories (ex: Électronique > Téléphones > Smartphones)
    categorieParente: {
      type: Schema.Types.ObjectId,
      ref: 'Categorie',
      default: null, // Une catégorie racine n'a pas de parent
    },
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actif: {
        type: Boolean,
        default: true
    }
  },
  {
    timestamps: true,
  }
);

// --- INDEX ---
// Index sur le nom pour des recherches rapides et pour la contrainte d'unicité.
categorieSchema.index({ nom: 1 });

/**
 * Middleware pre-remove pour empêcher la suppression d'une catégorie si elle est utilisée.
 * C'est une règle de gestion importante pour maintenir l'intégrité des données.
 */
categorieSchema.pre('remove', async function(next) {
    const Produit = mongoose.model('Produit');
    
    // Vérifier si des produits utilisent cette catégorie
    const productCount = await Produit.countDocuments({ categorie: this._id });

    if (productCount > 0) {
        // Si des produits sont liés, on empêche la suppression
        const error = new Error(`Impossible de supprimer la catégorie "${this.nom}" car elle est associée à ${productCount} produit(s).`);
        return next(error);
    }
    
    // Vérifier si des sous-catégories existent
    const subCategoryCount = await this.model('Categorie').countDocuments({ categorieParente: this._id });
    if (subCategoryCount > 0) {
        const error = new Error(`Impossible de supprimer la catégorie "${this.nom}" car elle contient ${subCategoryCount} sous-catégorie(s).`);
        return next(error);
    }

    next();
});


const Categorie = mongoose.model('Categorie', categorieSchema);

module.exports = Categorie;