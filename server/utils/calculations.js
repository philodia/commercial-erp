/**
 * @file calculations.js
 * @description Fonctions pures pour des calculs mathématiques et financiers de base.
 * Ces fonctions sont stateless et réutilisables dans toute l'application.
 */

const PRECISION = 100; // Utiliser 100 pour 2 décimales, 1000 pour 3, etc.

/**
 * Arrondit un nombre à une précision financière standard (2 décimales par défaut).
 * Prévient les erreurs de calcul avec les nombres à virgule flottante en JavaScript.
 * @param {number} number - Le nombre à arrondir.
 * @returns {number} Le nombre arrondi.
 */
const roundFinancial = (number) => {
  if (typeof number !== 'number') return 0;
  return Math.round(number * PRECISION) / PRECISION;
};

/**
 * Calcule un montant TTC à partir d'un montant HT et d'un taux de TVA.
 * @param {number} amountHT - Le montant Hors Taxe.
 * @param {number} taxRate - Le taux de TVA en pourcentage (ex: 18 pour 18%).
 * @returns {number} Le montant Toutes Taxes Comprises.
 */
const calculateTTC = (amountHT, taxRate) => {
  const taxAmount = amountHT * (taxRate / 100);
  const result = amountHT + taxAmount;
  return roundFinancial(result);
};

/**
 * Calcule un montant HT à partir d'un montant TTC et d'un taux de TVA.
 * @param {number} amountTTC - Le montant Toutes Taxes Comprises.
 * @param {number} taxRate - Le taux de TVA en pourcentage (ex: 18 pour 18%).
 * @returns {number} Le montant Hors Taxe.
 */
const calculateHT = (amountTTC, taxRate) => {
  const result = amountTTC / (1 + taxRate / 100);
  return roundFinancial(result);
};

/**
 * Calcule le montant de la taxe à partir d'un montant HT ou TTC.
 * @param {number} amount - Le montant de base.
 * @param {number} taxRate - Le taux de TVA en pourcentage.
 * @param {'HT' | 'TTC'} [fromType='HT'] - Le type du montant de base.
 * @returns {number} Le montant de la taxe.
 */
const calculateTaxAmount = (amount, taxRate, fromType = 'HT') => {
    if (fromType === 'HT') {
        return roundFinancial(amount * (taxRate / 100));
    }
    // Si fromType est 'TTC'
    const amountHT = calculateHT(amount, taxRate);
    return roundFinancial(amount - amountHT);
};

/**
 * Calcule le montant d'une remise.
 * @param {number} baseAmount - Le montant sur lequel appliquer la remise.
 * @param {number} discountValue - La valeur de la remise.
 * @param {'Pourcentage' | 'Montant'} discountType - Le type de remise.
 * @returns {number} Le montant de la remise calculée.
 */
const calculateDiscountAmount = (baseAmount, discountValue, discountType = 'Pourcentage') => {
  let discountAmount = 0;
  if (discountType === 'Pourcentage') {
    discountAmount = baseAmount * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }
  return roundFinancial(discountAmount);
};

/**
 * Calcule le pourcentage de marge entre un coût et un prix de vente.
 * @param {number} salePrice - Le prix de vente (HT).
 * @param {number} costPrice - Le prix d'achat / coût de revient.
 * @returns {number} La marge en pourcentage.
 */
const calculateMarginPercentage = (salePrice, costPrice) => {
    if (costPrice === 0) return Infinity; // Marge infinie si le coût est de 0
    const margin = ((salePrice - costPrice) / costPrice) * 100;
    return roundFinancial(margin);
};

module.exports = {
  roundFinancial,
  calculateTTC,
  calculateHT,
  calculateTaxAmount,
  calculateDiscountAmount,
  calculateMarginPercentage
};