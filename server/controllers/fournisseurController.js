const Fournisseur = require('../models/Fournisseur');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/helpers');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');

// @desc    Récupérer tous les fournisseurs (avec filtres, tri et pagination)
// @route   GET /api/v1/fournisseurs
// @access  Private
exports.getFournisseurs = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  // --- Filtrage ---
  let query = {};
  if (req.query.search) {
    query.nom = { $regex: req.query.search, $options: 'i' };
  }
  if (req.query.statut) {
    query.statut = req.query.statut;
  }
  
  // --- Exécution des requêtes ---
  const totalFournisseurs = await Fournisseur.countDocuments(query);
  const fournisseurs = await Fournisseur.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: fournisseurs.length,
    pagination: {
      total: totalFournisseurs,
      page,
      totalPages: calculateTotalPages(totalFournisseurs, limit)
    },
    data: formatApiCollection(fournisseurs),
  });
});


// @desc    Récupérer un seul fournisseur par son ID
// @route   GET /api/v1/fournisseurs/:id
// @access  Private
exports.getFournisseurById = asyncHandler(async (req, res, next) => {
  const fournisseur = await Fournisseur.findById(req.params.id);

  if (!fournisseur) {
    return next(
      new ErrorResponse(`Fournisseur non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(fournisseur),
  });
});


// @desc    Créer un nouveau fournisseur
// @route   POST /api/v1/fournisseurs
// @access  Private (Admin, Commercial)
exports.createFournisseur = asyncHandler(async (req, res, next) => {
  req.body.creePar = req.user.id;

  const fournisseur = await Fournisseur.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(fournisseur),
  });
});


// @desc    Mettre à jour un fournisseur
// @route   PUT /api/v1/fournisseurs/:id
// @access  Private (Admin, Commercial)
exports.updateFournisseur = asyncHandler(async (req, res, next) => {
  let fournisseur = await Fournisseur.findById(req.params.id);

  if (!fournisseur) {
    return next(
      new ErrorResponse(`Fournisseur non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  fournisseur = await Fournisseur.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(fournisseur),
  });
});


// @desc    Supprimer un fournisseur
// @route   DELETE /api/v1/fournisseurs/:id
// @access  Private (Admin)
exports.deleteFournisseur = asyncHandler(async (req, res, next) => {
  const fournisseur = await Fournisseur.findById(req.params.id);

  if (!fournisseur) {
    return next(
      new ErrorResponse(`Fournisseur non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // TODO: Ajouter une logique de vérification avant suppression.
  // On ne devrait pas pouvoir supprimer un fournisseur qui a des bons de commande ou des factures d'achat.
  // Il faudrait plutôt passer son statut à 'Inactif'.

  await fournisseur.remove();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: {},
    message: "Fournisseur supprimé avec succès."
  });
});