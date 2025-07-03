/**
 * Fichier de configuration pour le middleware CORS (Cross-Origin Resource Sharing).
 *
 * Ce fichier définit quelles origines (clients) sont autorisées à faire des requêtes
 * à notre API. C'est une mesure de sécurité essentielle pour empêcher des sites
 * web non autorisés d'interagir avec votre backend.
 *
 * En production, seule l'URL de votre application frontend (React) doit être autorisée.
 */

// Liste blanche des origines autorisées à accéder à l'API.
const allowedOrigins = [
  // L'URL de votre client React en production, à définir dans le fichier .env
  process.env.CLIENT_URL,
  
  // URLs pour l'environnement de développement local
  'http://localhost:3000', // Port par défaut de create-react-app
  'http://localhost:3001', // Autre port de développement possible
  'http://localhost:5173', // Port par défaut de Vite.js
];

const corsOptions = {
  /**
   * origin: Contrôle l'en-tête 'Access-Control-Allow-Origin'.
   * @param {string} origin - L'origine de la requête entrante (ex: 'http://localhost:3000').
   * @param {function} callback - Le callback à exécuter.
   */
  origin: (origin, callback) => {
    // 1. Autoriser les requêtes qui n'ont pas d'origine (ex: Postman, Insomnia, scripts serveur).
    // 2. Autoriser si l'origine de la requête est dans notre liste blanche.
    if (!origin || allowedOrigins.includes(origin)) {
      // Pas d'erreur, autoriser la requête.
      callback(null, true);
    } else {
      // Erreur, l'origine n'est pas autorisée.
      callback(new Error('Cette origine n\'est pas autorisée par notre politique CORS.'));
    }
  },

  /**
   * credentials: Autorise le navigateur à envoyer des informations d'identification
   * (comme des cookies ou des en-têtes d'autorisation) avec les requêtes.
   * C'est essentiel pour l'authentification par token JWT.
   */
  credentials: true,

  /**
   * allowedHeaders: Spécifie les en-têtes que le client est autorisé à inclure
   * dans sa requête. 'Authorization' est crucial pour les tokens JWT.
   */
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  /**
   * methods: Spécifie les méthodes HTTP que nous autorisons.
   */
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',

  /**
   * optionsSuccessStatus: Code de statut à renvoyer pour les requêtes de "pré-vérification"
   * (pre-flight) qui sont des requêtes OPTIONS. Le navigateur envoie ces requêtes
   * avant les requêtes complexes (comme PUT ou DELETE) pour voir s'il a le droit de les faire.
   * 204 (No Content) est une valeur standard et efficace.
   */
  optionsSuccessStatus: 204,
};

module.exports = corsOptions;