/**
 * Fichier de configuration pour l'authentification.
 * Centralise les paramètres liés aux JSON Web Tokens (JWT) et à d'autres aspects
 * de la sécurité. Les valeurs sont récupérées depuis les variables d'environnement
 * pour une meilleure sécurité et flexibilité.
 */
module.exports = {
  /**
   * Le secret utilisé pour signer et vérifier les JWT.
   * C'est une information critique qui DOIT être complexe et stockée en toute sécurité
   * dans les variables d'environnement.
   * Provient de : .env -> JWT_SECRET
   */
  jwtSecret: process.env.JWT_SECRET,

  /**
   * La durée de validité d'un token JWT.
   * Format accepté par la librairie `jsonwebtoken` (ex: "1h", "7d", "30d").
   * Provient de : .env -> JWT_EXPIRES_IN
   */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  /**
   * La durée de vie du cookie qui pourrait stocker le JWT côté client.
   * Exprimée en jours. Cette valeur est utilisée pour calculer la date d'expiration
   * du cookie. Un cookie httpOnly est une méthode de stockage plus sécurisée
   * que le localStorage car il n'est pas accessible via le JavaScript du client.
   * Provient de : .env -> JWT_COOKIE_EXPIRES_IN
   */
  cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 30,
};