const { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  addDays,
  subDays,
  isAfter,
  isBefore,
  parseISO
} = require('date-fns');

/**
 * @file dateUtils.js
 * @description Fonctions utilitaires pour la manipulation des dates.
 */

class DateUtils {
  /**
   * Retourne les dates de début et de fin pour une période donnée.
   * @param {'today' | 'this_month' | 'this_year' | object} period - La période souhaitée.
   * Si c'est un objet, il doit contenir { startDate, endDate }.
   * @returns {{startDate: Date, endDate: Date}} Un objet avec les dates de début et de fin.
   */
  getPeriodDates(period) {
    const now = new Date();

    if (typeof period === 'object' && period.startDate && period.endDate) {
      return {
        startDate: startOfDay(parseISO(period.startDate)),
        endDate: endOfDay(parseISO(period.endDate))
      };
    }
    
    switch (period) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'this_month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'this_year':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
      default:
        // Par défaut, retourne le mois en cours si la période est invalide
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }

  /**
   * Calcule une date d'échéance à partir d'une date de départ et d'un nombre de jours.
   * @param {Date | string} startDate - La date de début.
   * @param {number} days - Le nombre de jours à ajouter pour l'échéance (ex: 30).
   * @returns {Date} La date d'échéance calculée.
   */
  calculateDueDate(startDate, days) {
    const dateObj = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    return addDays(dateObj, days);
  }

  /**
   * Vérifie si une date est passée (dans le passé par rapport à maintenant).
   * @param {Date | string} date - La date à vérifier.
   * @returns {boolean} - True si la date est dans le passé.
   */
  isDateInPast(date) {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isBefore(dateObj, new Date());
  }
  
  /**
   * Vérifie si une date est future (dans le futur par rapport à maintenant).
   * @param {Date | string} date - La date à vérifier.
   * @returns {boolean} - True si la date est dans le futur.
   */
  isDateInFuture(date) {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isAfter(dateObj, new Date());
  }

  /**
   * Retourne la date du jour, au début de la journée (00:00:00).
   * @returns {Date}
   */
  getToday() {
    return startOfDay(new Date());
  }

  /**
   * Retourne la date d'hier.
   * @returns {Date}
   */
  getYesterday() {
    return startOfDay(subDays(new Date(), 1));
  }
}

// Exporter une instance unique de la classe
module.exports = new DateUtils();