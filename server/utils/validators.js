const { body, param, validationResult } = require('express-validator');

/**
 * Middleware pour gérer le résultat de la validation.
 * S'il y a des erreurs, il renvoie une réponse 400.
 * Sinon, il passe au prochain middleware.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// --- VALIDATEURS SPÉCIFIQUES ---

// Validateur pour l'ID de Mongoose dans les paramètres de l'URL
const validateMongoId = param('id').isMongoId().withMessage('ID invalide.');

// Validateurs pour l'Authentification (Auth)
const authValidators = {
  register: [
    body('nomComplet').notEmpty().withMessage('Le nom complet est requis.'),
    body('email').isEmail().withMessage('Veuillez fournir un email valide.').normalizeEmail(),
    body('motDePasse').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
  ],
  login: [
    body('email').isEmail().withMessage('Veuillez fournir un email valide.').normalizeEmail(),
    body('motDePasse').notEmpty().withMessage('Le mot de passe est requis.'),
  ],
};

// Validateurs pour les Clients
const clientValidators = {
  create: [
    body('nom').trim().notEmpty().withMessage('Le nom du client est requis.'),
    body('typeClient').isIn(['Particulier', 'Entreprise']).withMessage('Le type de client est invalide.'),
    body('telephone').trim().notEmpty().withMessage('Le numéro de téléphone est requis.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide.').normalizeEmail(),
  ],
  update: [
    body('nom').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide.'),
    body('typeClient').optional().isIn(['Particulier', 'Entreprise']).withMessage('Type de client invalide.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email invalide.').normalizeEmail(),
  ],
};

// Validateurs pour les Factures
const factureValidators = {
    create: [
        body('client').isMongoId().withMessage('ID de client invalide.'),
        body('dateEcheance').isISO8601().toDate().withMessage('Date d\'échéance invalide.'),
        body('lignes').isArray({ min: 1 }).withMessage('La facture doit contenir au moins une ligne.'),
        body('lignes.*.description').notEmpty().withMessage('La description de la ligne est requise.'),
        body('lignes.*.quantite').isNumeric({ min: 0.01 }).withMessage('La quantité doit être un nombre positif.'),
        body('lignes.*.prixUnitaireHT').isNumeric({ min: 0 }).withMessage('Le prix unitaire doit être un nombre positif ou nul.'),
    ]
}


// Exporter les chaînes de validation et le gestionnaire d'erreurs
module.exports = {
  handleValidationErrors,
  validateMongoId,
  authValidators,
  clientValidators,
  factureValidators,
  // ... ajouter d'autres validateurs ici au fur et à mesure
};