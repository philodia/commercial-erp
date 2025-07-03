const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma du Produit ou Service
 * Représente un article ou un service vendu ou acheté par l'entreprise.
 * Ce modèle est au cœur de la gestion des stocks, des ventes et des achats.
 */
const produitSchema = new Schema(
  {
    // --- Identification du Produit ---
    reference: {
      type: String,
      required: [true, 'La référence du produit est obligatoire.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    designation: {
      type: String,
      required: [true, 'La désignation est obligatoire.'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Bien', 'Service'],
      required: true,
      default: 'Bien',
    },
    
    // --- Catégorisation et Fournisseur ---
    categorie: {
      type: Schema.Types.ObjectId,
      ref: 'Categorie', // Référence au futur modèle Categorie
      required: [true, 'La catégorie est obligatoire.'],
    },
    fournisseurPrincipal: {
      type: Schema.Types.ObjectId,
      ref: 'Fournisseur',
    },
    
    // --- Informations de Prix et Fiscalité ---
    prixAchat: {
      type: Number,
      required: [true, 'Le prix d\'achat est obligatoire.'],
      default: 0,
    },
    prixVenteHT: {
      type: Number,
      required: [true, 'Le prix de vente HT est obligatoire.'],
      default: 0,
    },
    tauxTVA: {
      type: Number,
      required: true,
      default: 18, // Taux standard sénégalais
    },

    // --- Gestion de Stock (pour les Biens) ---
    uniteMesure: {
      type: String,
      default: 'Unité', // ex: 'kg', 'Litre', 'Mètre'
    },
    gestionStock: { // Permet de désactiver le suivi de stock pour certains articles
      type: Boolean,
      default: true,
    },
    quantiteEnStock: { // Quantité totale, tous dépôts confondus
      type: Number,
      default: 0,
      min: 0,
    },
    stockParDepot: [
      {
        depot: {
          type: Schema.Types.ObjectId,
          ref: 'Depot', // Référence à un futur modèle Depot
          required: true
        },
        quantite: {
          type: Number,
          required: true,
          default: 0,
          min: 0
        }
      }
    ],
    seuilAlerteStock: {
      type: Number,
      default: 0,
    },

    // --- Autres Informations ---
    codeBarres: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // L'index unique ne s'applique qu'aux documents qui ont ce champ
    },
    imageURL: {
      type: String,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    // Utilisation de virtuals pour les champs calculés
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- VIRTUALS ---

/**
 * Champ virtuel pour calculer le prix de vente TTC.
 * Ce champ n'est pas stocké en base de données, il est calculé à la volée.
 */
produitSchema.virtual('prixVenteTTC').get(function() {
  if (this.prixVenteHT == null || this.tauxTVA == null) {
    return null;
  }
  return this.prixVenteHT * (1 + this.tauxTVA / 100);
});

/**
 * Champ virtuel pour calculer la marge brute en pourcentage.
 */
produitSchema.virtual('margeBrute').get(function() {
    if (!this.prixVenteHT || !this.prixAchat || this.prixAchat === 0) {
        return 0;
    }
    return ((this.prixVenteHT - this.prixAchat) / this.prixAchat) * 100;
});


// --- INDEX ---
produitSchema.index({ reference: 1, designation: 'text' });


// --- MÉTHODES STATIQUES ---

/**
 * Met à jour le stock d'un produit pour un dépôt spécifique.
 * @param {string} produitId - L'ID du produit à mettre à jour.
 * @param {string} depotId - L'ID du dépôt concerné.
 * @param {number} quantite - La quantité à ajouter (positive) ou à retirer (négative).
 */
produitSchema.statics.mettreAJourStock = async function(produitId, depotId, quantite) {
    const produit = await this.findById(produitId);
    if (!produit) {
        throw new Error('Produit non trouvé');
    }

    // Mise à jour de la quantité totale
    produit.quantiteEnStock += quantite;

    // Mise à jour du stock par dépôt
    const depotStock = produit.stockParDepot.find(d => d.depot.toString() === depotId.toString());

    if (depotStock) {
        depotStock.quantite += quantite;
    } else {
        // Si le produit n'était pas encore dans ce dépôt, on l'ajoute
        produit.stockParDepot.push({ depot: depotId, quantite: quantite });
    }
    
    // S'assurer qu'un stock ne devient pas négatif
    if (produit.quantiteEnStock < 0 || (depotStock && depotStock.quantite < 0)) {
        throw new Error('Le stock ne peut pas devenir négatif.');
    }
    
    await produit.save();
    return produit;
};


const Produit = mongoose.model('Produit', produitSchema);

module.exports = Produit;