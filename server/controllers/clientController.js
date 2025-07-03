const Client = require('../models/Client');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/helpers');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');


// @desc    Récupérer tous les clients (avec filtres, tri et pagination)
// @route   GET /api/v1/clients
// @access  Private
exports.getClients = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  // --- Filtrage ---
  let query = {};
  if (req.query.search) {
    query.nom = { $regex: req.query.search, $options: 'i' }; // Recherche insensible à la casse sur le nom
  }
  if (req.query.typeClient) {
    query.typeClient = req.query.typeClient;
  }
  if (req.query.statut) {
    query.statut = req.query.statut;
  }
  
  // --- Exécution des requêtes ---
  const totalClients = await Client.countDocuments(query);
  const clients = await Client.find(query)
    .sort({ createdAt: -1 }) // Trier par les plus récents par défaut
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: clients.length,
    pagination: {
      total: totalClients,
      page,
      totalPages: calculateTotalPages(totalClients, limit)
    },
    data: formatApiCollection(clients),
  });
});


// @desc    Récupérer un seul client par son ID
// @route   GET /api/v1/clients/:id
// @access  Private
exports.getClientById = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return next(
      new ErrorResponse(`Client non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(client),
  });
});


// @desc    Créer un nouveau client
// @route   POST /api/v1/clients
// @access  Private (Admin, Commercial)
exports.createClient = asyncHandler(async (req, res, next) => {
  // Ajouter l'ID de l'utilisateur qui crée le client
  req.body.creePar = req.user.id;

  const client = await Client.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(client),
  });
});


// @desc    Mettre à jour un client
// @route   PUT /api/v1/clients/:id
// @access  Private (Admin, Commercial)
exports.updateClient = asyncHandler(async (req, res, next) => {
  let client = await Client.findById(req.params.id);

  if (!client) {
    return next(
      new ErrorResponse(`Client non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // Mettre à jour le client avec les nouvelles données
  client = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Retourne le document modifié
    runValidators: true, // Exécute les validateurs du modèle
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(client),
  });
});


// @desc    Supprimer un client
// @route   DELETE /api/v1/clients/:id
// @access  Private (Admin)
exports.deleteClient = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return next(
      new ErrorResponse(`Client non trouvé avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  // TODO: Ajouter une logique de vérification avant suppression.
  // Par exemple, on ne devrait pas pouvoir supprimer un client qui a des factures.
  // Il faudrait plutôt l'archiver/désactiver.
  // Pour l'instant, on procède à la suppression.

  await client.remove();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: {},
    message: "Client supprimé avec succès."
  });
});