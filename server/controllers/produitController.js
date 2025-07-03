const Produit = require('../models/Produit');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/helpers');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');
const path = require('path');

// @desc    Récupérer tous les produits (avec filtres, tri et pagination)
// @route   GET /api/v1/produits
// @access  Private
exports.getProduits = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  // --- Filtrage ---
  let query = {};
  if (req.query.search) {
    // Recherche sur la désignation OU la référence
    query.$or = [
      { designation: { $regex: req.query.search, $options: 'i' } },
      { reference: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  if (req.query.type) {
    query.type = req.query.type;
  }
  if (req.query.categorie) {
    query.categorie = req.query.categorie;
  }
  if (req.query.actif) {
    query.actif = req.query.actif === 'true';
  }
  
  // --- Exécution des requêtes ---
  const totalProduits = await Produit.countDocuments(query);
  const produits = await Produit.find(query)
    .populate('categorie', 'nom') // Peuple le nom de la catégorie
    .populate('fournisseurPrincipal', 'nom') // Peuple le nom du fournisseur
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: produits.length,
    pagination: {
      total: totalProduits,
      page,
      totalPages: calculateTotalPages(totalProduits, limit)
    },
    data: formatApiCollection(produits),
  });
});


// @desc    Récupérer un seul produit par son ID
// @route   GET /api/v1/produits/:id
// @access  Private
exports.getProduitById = asyncHandler(async (req, res, next) => {
  const produit = await Produit.findById(req.params.id).populate('categorie', 'nom');

  if (!produit) {
    return next(
      new ErrorResponse(`Produit non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(produit),
  });
});


// @desc    Créer un nouveau produit
// @route   POST /api/v1/produits
// @access  Private (Admin, Commercial)
exports.createProduit = asyncHandler(async (req, res, next) => {
  req.body.creePar = req.user.id;

  const produit = await Produit.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(produit),
  });
});


// @desc    Mettre à jour un produit
// @route   PUT /api/v1/produits/:id
// @access  Private (Admin, Commercial)
exports.updateProduit = asyncHandler(async (req, res, next) => {
  let produit = await Produit.findById(req.params.id);

  if (!produit) {
    return next(
      new ErrorResponse(`Produit non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  produit = await Produit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(produit),
  });
});


// @desc    Supprimer un produit
// @route   DELETE /api/v1/produits/:id
// @access  Private (Admin)
exports.deleteProduit = asyncHandler(async (req, res, next) => {
  const produit = await Produit.findById(req.params.id);

  if (!produit) {
    return next(
      new ErrorResponse(`Produit non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // TODO: Ajouter une logique de vérification avant suppression.
  // On ne devrait pas pouvoir supprimer un produit qui a des lignes de facture ou des mouvements de stock.
  // Il faudrait plutôt passer son statut `actif` à `false`.

  await produit.remove();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: {},
    message: "Produit supprimé avec succès."
  });
});


// @desc    Uploader l'image d'un produit
// @route   PUT /api/v1/produits/:id/image
// @access  Private (Admin, Commercial)
exports.uploadProduitImage = asyncHandler(async (req, res, next) => {
    const produit = await Produit.findById(req.params.id);

    if (!produit) {
        return next(
            new ErrorResponse(`Produit non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
        );
    }
    
    if (!req.file) {
        return next(new ErrorResponse(`Veuillez uploader un fichier.`, HTTP_STATUS_CODES.BAD_REQUEST));
    }
    
    // Le middleware 'upload.js' a déjà géré la validation du type et de la taille.
    // req.file.path contient le chemin où le fichier a été sauvegardé.
    // On sauvegarde ce chemin dans le document produit.
    produit.imageURL = req.file.path;
    await produit.save();

    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: { imageURL: produit.imageURL }
    });
});