const { format, parseISO } = require('date-fns');
const { fr } = require('date-fns/locale');

/**
 * @file formatters.js
 * @description Fonctions utilitaires pour formater les données avant de les envoyer au client.
 */

/**
 * Formate un montant numérique en une chaîne de caractères monétaire pour une devise donnée.
 * @param {number} amount - Le montant à formater.
 * @param {string} currencyCode - Le code ISO de la devise (ex: 'XOF', 'EUR').
 * @param {string} [locale='fr-SN'] - La locale à utiliser pour le formatage.
 * @returns {string} Le montant formaté (ex: "12 500 F CFA").
 */
const formatCurrency = (amount, currencyCode = 'XOF', locale = 'fr-SN') => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol' // ou 'code', 'name'
  }).format(amount);
};

/**
 * Formate un objet Date ou une chaîne ISO en une date lisible.
 * @param {Date | string} date - La date à formater.
 * @param {string} [formatString='dd MMMM yyyy'] - Le format de sortie (selon date-fns).
 * @returns {string} La date formatée (ex: "18 mars 2024").
 */
const formatDate = (date, formatString = 'dd MMMM yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  try {
    return format(dateObj, formatString, { locale: fr });
  } catch (error) {
    return 'Date invalide';
  }
};

/**
 * Formate un objet Date ou une chaîne ISO en date et heure lisibles.
 * @param {Date | string} date - La date à formater.
 * @returns {string} La date et l'heure formatées (ex: "18/03/2024 14:30").
 */
const formatDateTime = (date) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};


/**
 * Formate un objet représentant une ressource API pour la réponse.
 * Retire les champs internes comme `__v` et transforme `_id` en `id`.
 * @param {object} resource - Un document Mongoose ou un objet simple.
 * @returns {object} L'objet formaté et nettoyé.
 */
const formatApiResponse = (resource) => {
    if (!resource) return null;

    // Si c'est un document Mongoose, le convertir en objet simple
    const resourceObject = typeof resource.toObject === 'function' ? resource.toObject({ virtuals: true }) : resource;
    
    // Gérer les cas où l'objet est déjà formaté ou n'a pas d'_id
    if (resourceObject.id) {
        delete resourceObject._id;
    } else if (resourceObject._id) {
        resourceObject.id = resourceObject._id.toString();
        delete resourceObject._id;
    }
    
    delete resourceObject.__v;
    
    return resourceObject;
};

/**
 * Formate un tableau de ressources API.
 * @param {Array<object>} resources - Un tableau de documents Mongoose ou d'objets.
 * @returns {Array<object>} Le tableau d'objets formatés.
 */
const formatApiCollection = (resources) => {
    if (!Array.isArray(resources)) return [];
    return resources.map(formatApiResponse);
};


module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatApiResponse,
  formatApiCollection,
};