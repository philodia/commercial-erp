const { HTTP_STATUS_CODES } = require('../utils/constants');

/**
 * @class ErrorResponse
 * @extends Error
 * @description Classe personnalisée pour les erreurs API, permettant de spécifier un code de statut HTTP.
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}


/**
 * Middleware de gestion des erreurs.
 * Ce middleware s'exécute lorsque `next(error)` est appelé dans un contrôleur ou un autre middleware.
 * Il formate une réponse d'erreur JSON standardisée.
 * @param {Error | ErrorResponse} err - L'objet d'erreur.
 * @param {object} req - L'objet requête Express.
 * @param {object} res - L'objet réponse Express.
 * @param {function} next - La fonction pour passer au prochain middleware (non utilisée ici).
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log l'erreur en console pour le développeur
  console.error('--- ERROR ---');
  console.error(err.stack);
  console.error('--- END ERROR ---');

  // Gestion des erreurs spécifiques de Mongoose
  // 1. Erreur de Cast (ID mal formé)
  if (err.name === 'CastError') {
    const message = `Ressource non trouvée avec l'ID mal formé : ${err.value}`;
    error = new ErrorResponse(message, HTTP_STATUS_CODES.NOT_FOUND);
  }

  // 2. Erreur de clé dupliquée
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = Object.values(err.keyValue)[0];
    const message = `Valeur dupliquée pour le champ '${field}'. La valeur '${value}' existe déjà.`;
    error = new ErrorResponse(message, HTTP_STATUS_CODES.CONFLICT);
  }

  // 3. Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    // On ne prend que le premier message pour une réponse plus simple, mais on pourrait tous les joindre.
    error = new ErrorResponse(messages[0], HTTP_STATUS_CODES.BAD_REQUEST);
  }

  // Envoyer la réponse d'erreur finale
  res.status(error.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: error.message || 'Erreur Interne du Serveur',
  });
};

module.exports = { errorHandler, ErrorResponse };