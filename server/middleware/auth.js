const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../utils/helpers');
const { ErrorResponse } = require('./errorHandler');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const User = require('../models/User');

/**
 * Middleware pour protéger les routes qui nécessitent une authentification.
 * Il vérifie la présence et la validité d'un token JWT dans l'en-tête 'Authorization'.
 * Si le token est valide, il attache l'utilisateur correspondant à `req.user`.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Vérifier si le token est dans l'en-tête Authorization (schéma Bearer)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // TODO: On pourrait aussi vérifier la présence du token dans un cookie
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  if (!token) {
    return next(
      new ErrorResponse('Accès non autorisé. Token manquant.', HTTP_STATUS_CODES.UNAUTHORIZED)
    );
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Trouver l'utilisateur correspondant à l'ID du token et l'attacher à la requête
    // On exclut le mot de passe, même s'il n'est pas sélectionné par défaut
    req.user = await User.findById(decoded.id).select('-motDePasse');

    if (!req.user) {
        return next(new ErrorResponse('Utilisateur non trouvé.', HTTP_STATUS_CODES.UNAUTHORIZED));
    }

    next();
  } catch (error) {
    // Gérer les erreurs de token (expiré, invalide)
    return next(
      new ErrorResponse('Accès non autorisé. Token invalide ou expiré.', HTTP_STATUS_CODES.UNAUTHORIZED)
    );
  }
});


/**
 * Middleware pour autoriser l'accès à une route en fonction du rôle de l'utilisateur.
 * Doit être utilisé APRÈS le middleware `protect`.
 * @param {...string} roles - Une liste de rôles autorisés (ex: 'Admin', 'Comptable').
 * @returns {function} Le middleware d'autorisation.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // req.user est peuplé par le middleware `protect`
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Le rôle '${req.user.role}' n'est pas autorisé à accéder à cette ressource.`,
          HTTP_STATUS_CODES.FORBIDDEN
        )
      );
    }
    next();
  };
};