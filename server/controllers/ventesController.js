const Vente = require('../models/Vente');
const Client = require('../models/Client');
const Produit = require('../models/Produit');
const Parametres = require('../models/Parametres');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler, generateDocumentNumber } = require('../utils/helpers');
const { HTTP_STATUS_CODES, DOCUMENT_STATUS } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');
const calculService = require('../services/calculService');


// @desc    Récupérer toutes les ventes (avec filtres, tri et pagination)
// @route   GET /api/v1/ventes
// @access  Private
exports.getVentes = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  let query = {};
  if (req.query.search) {
    query.numeroVente = { $regex: req.query.search, $options: 'i' };
  }
  if (req.query.client) {
    query.client = req.query.client;
  }
  if (req.query.statut) {
    query.statut = req.query.statut;
  }
  
  const totalVentes = await Vente.countDocuments(query);
  const ventes = await Vente.find(query)
    .populate('client', 'nom codeClient')
    .populate('vendeur', 'nomComplet')
    .sort({ dateVente: -1 })
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: ventes.length,
    pagination: {
      total: totalVentes,
      page,
      totalPages: calculateTotalPages(totalVentes, limit)
    },
    data: formatApiCollection(ventes),
  });
});


// @desc    Récupérer une seule vente par son ID
// @route   GET /api/v1/ventes/:id
// @access  Private
exports.getVenteById = asyncHandler(async (req, res, next) => {
  const vente = await Vente.findById(req.params.id)
    .populate('client')
    .populate('vendeur', 'nomComplet')
    .populate('lignes.produit', 'reference designation');

  if (!vente) {
    return next(
      new ErrorResponse(`Vente non trouvée avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(vente),
  });
});


// @desc    Créer une nouvelle vente
// @route   POST /api/v1/ventes
// @access  Private (Admin, Commercial, Vendeur)
exports.createVente = asyncHandler(async (req, res, next) => {
  req.body.vendeur = req.user.id;
  req.body.creePar = req.user.id;

  // --- Génération du numéro de vente ---
  const params = await Parametres.findOneAndUpdate(
      {}, 
      { $inc: { sequenceVente: 1 } },
      { new: true }
  );
  req.body.numeroVente = generateDocumentNumber(params.prefixeVente, params.sequenceVente);

  // --- Validation et enrichissement des lignes ---
  for (const ligne of req.body.lignes) {
      const produit = await Produit.findById(ligne.produit);
      if (!produit) {
        return next(new ErrorResponse(`Produit avec ID ${ligne.produit} non trouvé.`, HTTP_STATUS_CODES.BAD_REQUEST));
      }
      // On enrichit la ligne avec les infos du produit (snapshot)
      ligne.description = produit.designation;
      ligne.prixUnitaireHT = ligne.prixUnitaireHT || produit.prixVenteHT;
      ligne.tauxTVA = produit.tauxTVA;
  }
  
  // Les totaux seront calculés par le hook pre-save du modèle Vente

  const vente = await Vente.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(vente),
  });
});


// @desc    Mettre à jour une vente
// @route   PUT /api/v1/ventes/:id
// @access  Private (Admin, Commercial)
exports.updateVente = asyncHandler(async (req, res, next) => {
  let vente = await Vente.findById(req.params.id);

  if (!vente) {
    return next(new ErrorResponse(`Vente non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
  }
  
  // On ne peut modifier qu'un brouillon
  if (vente.statut !== DOCUMENT_STATUS.DRAFT) {
      return next(new ErrorResponse(`Impossible de modifier une vente qui n'est plus à l'état de brouillon.`, HTTP_STATUS_CODES.BAD_REQUEST));
  }

  // Recalculer les lignes si elles sont modifiées
  if (req.body.lignes) {
    for (const ligne of req.body.lignes) {
      if (!ligne.description || !ligne.tauxTVA) { // Si c'est une nouvelle ligne
        const produit = await Produit.findById(ligne.produit);
        ligne.description = produit.designation;
        ligne.prixUnitaireHT = ligne.prixUnitaireHT || produit.prixVenteHT;
        ligne.tauxTVA = produit.tauxTVA;
      }
    }
  }

  vente = await Vente.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(vente),
  });
});


// @desc    Supprimer une vente (brouillon ou annulée)
// @route   DELETE /api/v1/ventes/:id
// @access  Private (Admin)
exports.deleteVente = asyncHandler(async (req, res, next) => {
  const vente = await Vente.findById(req.params.id);

  if (!vente) {
    return next(new ErrorResponse(`Vente non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
  }

  if (![DOCUMENT_STATUS.DRAFT, DOCUMENT_STATUS.CANCELLED].includes(vente.statut)) {
      return next(new ErrorResponse(`Impossible de supprimer une vente en cours.`, HTTP_STATUS_CODES.BAD_REQUEST));
  }

  await vente.remove();

  res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: {}, message: "Vente supprimée." });
});


// @desc    Changer le statut d'une vente (ex: confirmer)
// @route   PATCH /api/v1/ventes/:id/statut
// @access  Private (Admin, Commercial)
exports.updateVenteStatus = asyncHandler(async (req, res, next) => {
    const { statut } = req.body;
    
    // TODO: Ajouter un validateur pour les statuts possibles
    
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
        return next(new ErrorResponse(`Vente non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
    }
    
    // TODO: Mettre en place une machine à états pour valider les transitions de statut
    // Ex: On ne peut pas passer de 'Facturée' à 'Brouillon'
    
    // Si on confirme la vente, on pourrait déclencher la réservation de stock
    if (statut === DOCUMENT_STATUS.CONFIRMED && vente.statut === DOCUMENT_STATUS.DRAFT) {
        // Logique de réservation de stock...
        console.log(`La vente ${vente.numeroVente} est confirmée. Prêt à impacter le stock.`);
    }

    vente.statut = statut;
    await vente.save();
    
    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: formatApiResponse(vente)
    });
});