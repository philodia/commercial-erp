const Achat = require('../models/Achat');
const Fournisseur = require('../models/Fournisseur');
const Produit = require('../models/Produit');
const Parametres = require('../models/Parametres');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler, generateDocumentNumber } = require('../utils/helpers');
const { HTTP_STATUS_CODES, DOCUMENT_STATUS } = require('../utils/constants');
const { getPagination, calculateTotalPages } = require('../utils/helpers');
const { formatApiResponse, formatApiCollection } = require('../utils/formatters');

// @desc    Récupérer toutes les commandes d'achat
// @route   GET /api/v1/achats
// @access  Private
exports.getAchats = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPagination(req.query);

  let query = {};
  if (req.query.search) {
    query.numeroAchat = { $regex: req.query.search, $options: 'i' };
  }
  if (req.query.fournisseur) {
    query.fournisseur = req.query.fournisseur;
  }
  if (req.query.statut) {
    query.statut = req.query.statut;
  }
  
  const totalAchats = await Achat.countDocuments(query);
  const achats = await Achat.find(query)
    .populate('fournisseur', 'nom codeFournisseur')
    .populate('acheteur', 'nomComplet')
    .sort({ dateAchat: -1 })
    .skip(skip)
    .limit(limit);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    count: achats.length,
    pagination: {
      total: totalAchats,
      page,
      totalPages: calculateTotalPages(totalAchats, limit)
    },
    data: formatApiCollection(achats),
  });
});


// @desc    Récupérer une seule commande d'achat par son ID
// @route   GET /api/v1/achats/:id
// @access  Private
exports.getAchatById = asyncHandler(async (req, res, next) => {
  const achat = await Achat.findById(req.params.id)
    .populate('fournisseur')
    .populate('acheteur', 'nomComplet')
    .populate('lignes.produit', 'reference designation');

  if (!achat) {
    return next(
      new ErrorResponse(`Commande d'achat non trouvée avec l'ID ${req.params.id}`, HTTP_STATUS_CODES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(achat),
  });
});


// @desc    Créer une nouvelle commande d'achat
// @route   POST /api/v1/achats
// @access  Private (Admin, Commercial)
exports.createAchat = asyncHandler(async (req, res, next) => {
  req.body.acheteur = req.user.id;
  req.body.creePar = req.user.id;

  // --- Génération du numéro d'achat ---
  const params = await Parametres.findOneAndUpdate(
      {}, 
      { $inc: { sequenceAchat: 1 } },
      { new: true }
  );
  req.body.numeroAchat = generateDocumentNumber(params.prefixeAchat, params.sequenceAchat);

  // --- Validation et enrichissement des lignes ---
  for (const ligne of req.body.lignes) {
      const produit = await Produit.findById(ligne.produit);
      if (!produit) {
        return next(new ErrorResponse(`Produit avec ID ${ligne.produit} non trouvé.`, HTTP_STATUS_CODES.BAD_REQUEST));
      }
      ligne.description = produit.designation;
      // Pour un achat, le prix est souvent négocié, donc on s'attend à ce qu'il soit fourni.
      // On peut prendre le prix d'achat du produit comme fallback.
      ligne.prixUnitaireHT = ligne.prixUnitaireHT || produit.prixAchat;
      ligne.tauxTVA = produit.tauxTVA; // Le taux de TVA dépend du produit/service acheté.
  }
  
  const achat = await Achat.create(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    data: formatApiResponse(achat),
  });
});


// @desc    Mettre à jour une commande d'achat
// @route   PUT /api/v1/achats/:id
// @access  Private (Admin, Commercial)
exports.updateAchat = asyncHandler(async (req, res, next) => {
  let achat = await Achat.findById(req.params.id);

  if (!achat) {
    return next(new ErrorResponse(`Commande d'achat non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
  }
  
  if (achat.statut !== DOCUMENT_STATUS.DRAFT) {
      return next(new ErrorResponse(`Impossible de modifier une commande d'achat qui n'est plus à l'état de brouillon.`, HTTP_STATUS_CODES.BAD_REQUEST));
  }

  // Enrichir les nouvelles lignes si elles sont ajoutées
  if (req.body.lignes) {
    for (const ligne of req.body.lignes) {
      if (!ligne.description) {
        const produit = await Produit.findById(ligne.produit);
        ligne.description = produit.designation;
        ligne.prixUnitaireHT = ligne.prixUnitaireHT || produit.prixAchat;
        ligne.tauxTVA = produit.tauxTVA;
      }
    }
  }

  achat = await Achat.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: formatApiResponse(achat),
  });
});


// @desc    Supprimer une commande d'achat
// @route   DELETE /api/v1/achats/:id
// @access  Private (Admin)
exports.deleteAchat = asyncHandler(async (req, res, next) => {
  const achat = await Achat.findById(req.params.id);

  if (!achat) {
    return next(new ErrorResponse(`Commande d'achat non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
  }

  if (![DOCUMENT_STATUS.DRAFT, DOCUMENT_STATUS.CANCELLED].includes(achat.statut)) {
      return next(new ErrorResponse(`Impossible de supprimer une commande d'achat en cours.`, HTTP_STATUS_CODES.BAD_REQUEST));
  }

  await achat.remove();

  res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: {}, message: "Commande d'achat supprimée." });
});


// @desc    Changer le statut d'une commande d'achat
// @route   PATCH /api/v1/achats/:id/statut
// @access  Private (Admin, Commercial)
exports.updateAchatStatus = asyncHandler(async (req, res, next) => {
    const { statut } = req.body;
    
    const achat = await Achat.findById(req.params.id);
    if (!achat) {
        return next(new ErrorResponse(`Commande d'achat non trouvée`, HTTP_STATUS_CODES.NOT_FOUND));
    }
    
    if (statut === DOCUMENT_STATUS.ORDERED && achat.statut === DOCUMENT_STATUS.DRAFT) {
        // Logique pour envoyer un email au fournisseur, par exemple.
        console.log(`La commande d'achat ${achat.numeroAchat} est passée au statut 'Commandé'.`);
    }

    achat.statut = statut;
    await achat.save();
    
    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: formatApiResponse(achat)
    });
});