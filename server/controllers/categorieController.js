const Categorie = require('../models/Categorie');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/helpers');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');

// @desc    Récupérer toutes les catégories (avec filtres et pagination)
// @route   GET /api/v1/categories
// @access  Private
exports.getCategories = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  let query = {};
  if (req.query.search) {
    query.nom = { $regex: req.query.search, $options: 'i' };
  }
  
  const totalCategories = await Categorie.countDocuments(query);
  const categories = await Categorie.find(query)
    .populate('categorieParente', 'nom') // Peuple le nom de la catégorie parente
    .sort({ nom: 1 }) // Trier par ordre alphabétique
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: categories.length,
    pagination: {
      total: totalCategories,
      page,
      totalPages: calculateTotalPages(totalCategories, limit)
    },
    data: formatApiCollection(categories),
  });
});


// @desc    Récupérer une seule catégorie par son ID
// @route   GET /api/v1/categories/:id
// @access  Private
exports.getCategorieById = asyncHandler(async (req, res, next) => {
  const categorie = await Categorie.findById(req.params.id).populate('categorieParente', 'nom');

  if (!categorie) {
    return next(
      new ErrorResponse(`Catégorie non trouvée avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(categorie),
  });
});


// @desc    Créer une nouvelle catégorie
// @route   POST /api/v1/categories
// @access  Private (Admin, Commercial)
exports.createCategorie = asyncHandler(async (req, res, next) => {
  req.body.creePar = req.user.id;
  
  // Vérifier si une catégorie parente est fournie et si elle existe
  if (req.body.categorieParente) {
      const parent = await Categorie.findById(req.body.categorieParente);
      if (!parent) {
          return next(
            new ErrorResponse(`Catégorie parente non trouvée avec l'ID ${req.body.categorieParente}`, HTTP_STATUS_CODES.BAD_REQUEST)
          );
      }
  }

  const categorie = await Categorie.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(categorie),
  });
});


// @desc    Mettre à jour une catégorie
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin, Commercial)
exports.updateCategorie = asyncHandler(async (req, res, next) => {
  let categorie = await Categorie.findById(req.params.id);

  if (!categorie) {
    return next(
      new ErrorResponse(`Catégorie non trouvée avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // Empêcher de se définir soi-même comme parent
  if (req.body.categorieParente && req.body.categorieParente === req.params.id) {
    return next(
        new ErrorResponse('Une catégorie ne peut pas être sa propre parente.', HTTP_STATUS_CODES.BAD_REQUEST)
    );
  }

  categorie = await Categorie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(categorie),
  });
});


// @desc    Supprimer une catégorie
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
exports.deleteCategorie = asyncHandler(async (req, res, next) => {
  const categorie = await Categorie.findById(req.params.id);

  if (!categorie) {
    return next(
      new ErrorResponse(`Catégorie non trouvée avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // Le hook pre-remove sur le modèle Categorie s'occupera de vérifier
  // si la catégorie est utilisée par des produits ou d'autres catégories
  // avant de permettre la suppression.
  await categorie.remove();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: {},
    message: "Catégorie supprimée avec succès."
  });
});