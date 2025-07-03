const rateLimit = require('express-rate-limit');

/**
 * @file rateLimiter.js
 * @description Configure les middlewares de limitation de débit pour protéger l'API contre les abus.
 */

// Configuration de base pour la plupart des routes de l'API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Période de 15 minutes
  max: 200, // Limite chaque IP à 200 requêtes par `windowMs`
  standardHeaders: true, // Retourne les informations de limite dans les en-têtes `RateLimit-*`
  legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*` (obsolètes)
  message: {
    status: 429, // Too Many Requests
    message: 'Trop de requêtes effectuées depuis cette IP, veuillez réessayer après 15 minutes.',
  },
});


// Configuration plus stricte pour les routes d'authentification et les actions sensibles
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // Période de 10 minutes
  max: 10, // Limite chaque IP à 10 tentatives (de connexion, de réinitialisation, etc.)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Trop de tentatives. Veuillez réessayer plus tard.',
  },
  // skipSuccessfulRequests: true, // Optionnel : ne pas compter les requêtes qui réussissent
});


// Configuration pour les opérations de création lourdes (ex: import de masse)
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Période d'1 heure
    max: 50, // Limite à 50 opérations de création par heure
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Vous avez atteint la limite de création. Veuillez réessayer dans une heure.',
    },
});


module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter,
};