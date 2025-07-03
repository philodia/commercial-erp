/**
 * @file helpers.js
 * @description Fonctions d'aide génériques et réutilisables pour l'ensemble du projet.
 */

/**
 * Enveloppe une fonction de contrôleur asynchrone pour gérer les erreurs.
 * Évite d'avoir à écrire des blocs try...catch dans chaque contrôleur.
 * Si une erreur se produit dans la fonction asynchrone, elle est passée à next()
 * pour être gérée par le middleware de gestion d'erreurs global.
 * @param {Function} fn - La fonction de contrôleur asynchrone (req, res, next) => { ... }
 * @returns {Function} Une nouvelle fonction qui gère les erreurs.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


/**
 * Génère un numéro de document séquentiel avec un préfixe et un padding de zéros.
 * @param {string} prefix - Le préfixe du document (ex: 'FAC-').
 * @param {number} sequenceNumber - Le numéro de la séquence (ex: 1, 42, 123).
 * @param {number} [paddingLength=6] - La longueur totale du numéro avec le padding.
 * @returns {string} Le numéro de document formaté (ex: 'FAC-000001', 'FAC-000042').
 */
const generateDocumentNumber = (prefix, sequenceNumber, paddingLength = 6) => {
  const paddedSequence = String(sequenceNumber).padStart(paddingLength, '0');
  return `${prefix}${paddedSequence}`;
};


/**
 * Extrait et valide les paramètres de pagination de l'objet de requête.
 * @param {object} query - L'objet req.query d'Express.
 * @returns {{page: number, limit: number, skip: number}} Un objet avec les informations de pagination pour les requêtes Mongoose.
 */
const getPagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 25; // Limite par défaut à 25
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Calcule le nombre total de pages pour une pagination.
 * @param {number} totalDocuments - Le nombre total de documents dans la collection.
 * @param {number} limit - Le nombre de documents par page.
 * @returns {number} Le nombre total de pages.
 */
const calculateTotalPages = (totalDocuments, limit) => {
  return Math.ceil(totalDocuments / limit);
};


module.exports = {
  asyncHandler,
  generateDocumentNumber,
  getPagination,
  calculateTotalPages,
};