const morgan = require('morgan');
const fs = 'fs'; // Pour l'écriture dans des fichiers de log en production
const path = 'path'; // Pour la gestion des chemins de fichiers

/**
 * @file logging.js
 * @description Configure le middleware de logging des requêtes HTTP (morgan).
 * Le format des logs s'adapte à l'environnement (développement vs production).
 */

// Créer un token personnalisé pour morgan pour logger l'ID de l'utilisateur s'il est connecté
morgan.token('user-id', (req, res) => {
    // req.user est généralement peuplé par le middleware d'authentification
    return req.user ? req.user.id : 'anonymous';
});

// Créer un token pour le corps de la requête (utile pour le débogage)
// ATTENTION: À utiliser avec précaution, peut logger des informations sensibles (mots de passe, etc.)
// Nous ne l'utiliserons pas dans le format par défaut pour la production.
morgan.token('body', (req, res) => {
    return JSON.stringify(req.body);
});

// Définir les formats de log
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] - User: :user-id';
const productionFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';


/**
 * Middleware de logging.
 * Utilise un format coloré et concis en développement.
 * Utilise un format standard et complet en production.
 */
const loggingMiddleware = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        // En développement, on logue dans la console avec des couleurs pour la lisibilité
        return morgan(developmentFormat, {
            // Optionnel: sauter les requêtes qui ont réussi pour ne voir que les erreurs
            // skip: function (req, res) { return res.statusCode < 400 }
        })(req, res, next);
    } else {
        // En production, on utilise un format standard (type 'combined') avec notre token user-id
        // Idéalement, on écrirait dans un fichier de log rotatif.
        // Pour la simplicité, on logue dans la console, mais le format est prêt pour un fichier.
        return morgan(productionFormat)(req, res, next);
    }
};

module.exports = loggingMiddleware;