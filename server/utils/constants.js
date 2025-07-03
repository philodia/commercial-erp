/**
 * @file constants.js
 * @description Fichier central pour toutes les constantes et énumérations de l'application.
 * L'utilisation de constantes améliore la maintenabilité et réduit les erreurs.
 */

// Utilise Object.freeze pour rendre les objets immuables et éviter les modifications accidentelles.
const USER_ROLES = Object.freeze({
  ADMIN: 'Admin',
  COMPTABLE: 'Comptable',
  COMMERCIAL: 'Commercial',
  VENDEUR: 'Vendeur',
});

const DOCUMENT_STATUS = Object.freeze({
  // Statuts communs
  DRAFT: 'Brouillon',
  CANCELLED: 'Annulée',
  
  // Statuts de Devis
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',

  // Statuts de Vente/Commande
  CONFIRMED: 'Confirmée',
  IN_PREPARATION: 'En préparation',
  SHIPPED: 'Expédiée',
  INVOICED: 'Facturée',

  // Statuts de Facture
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiellement payée',
  LATE: 'En retard',

  // Statuts d'Achat/Bon de Commande
  ORDERED: 'Commandé',
  PARTIALLY_RECEIVED: 'Partiellement reçu',
  RECEIVED: 'Reçu',
});

const PAYMENT_STATUS = Object.freeze({
    UNPAID: 'Non payé',
    PARTIALLY_PAID: 'Partiellement payé',
    PAID: 'Payé',
});

const PAYMENT_METHOD = Object.freeze({
    BANK_TRANSFER: 'Virement bancaire',
    CHECK: 'Chèque',
    CASH: 'Espèces',
    CREDIT_CARD: 'Carte bancaire',
    ORANGE_MONEY: 'Orange Money',
    WAVE: 'Wave',
    OTHER: 'Autre',
});

const STOCK_MOVEMENT_TYPES = Object.freeze({
  PURCHASE_ENTRY: 'ENTREE_ACHAT',
  SALE_EXIT: 'SORTIE_VENTE',
  INVENTORY_ADJUSTMENT: 'AJUSTEMENT_INV',
  OUTGOING_TRANSFER: 'TRANSFERT_SORTANT',
  INCOMING_TRANSFER: 'TRANSFERT_ENTRANT',
  CUSTOMER_RETURN: 'RETOUR_CLIENT',
  SUPPLIER_RETURN: 'RETOUR_FOURNISSEUR',
  LOSS_BREAKAGE: 'PERTE_CASSE',
  INITIAL_ENTRY: 'ENTREE_INITIALE',
});

const ACCOUNTING = Object.freeze({
    DEBIT: 'Débit',
    CREDIT: 'Crédit',
    BALANCE_SHEET: 'Bilan',
    INCOME_STATEMENT: 'Résultat',
});

const HTTP_STATUS_CODES = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
});

module.exports = {
  USER_ROLES,
  DOCUMENT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  STOCK_MOVEMENT_TYPES,
  ACCOUNTING,
  HTTP_STATUS_CODES,
};