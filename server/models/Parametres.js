const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma des Paramètres Généraux de l'Application.
 * Ce modèle est conçu pour être un Singleton : il n'y aura qu'un seul document
 * dans cette collection, contenant toutes les configurations de l'entreprise.
 */
const parametresSchema = new Schema(
  {
    // --- Informations sur l'entreprise ---
    nomEntreprise: { type: String, required: true, trim: true },
    adresse: { rue: String, ville: String, codePostal: String, pays: String },
    telephone: { type: String, trim: true },
    email: { type: String, trim: true },
    siteWeb: { type: String, trim: true },
    logoURL: { type: String, trim: true },
    ninea: { type: String, trim: true },
    registreCommerce: { type: String, trim: true },

    // --- Paramètres par défaut de l'application ---
    deviseParDefaut: { type: Schema.Types.ObjectId, ref: 'Devise', required: true },
    taxeParDefaut: { type: Schema.Types.ObjectId, ref: 'Taxe', required: true },
    depotParDefaut: { type: Schema.Types.ObjectId, ref: 'Depot', required: true },
    langueParDefaut: { type: String, default: 'fr', enum: ['fr', 'en', 'wo'] },

    // --- Préférences de facturation et devis ---
    prefixeDevis: { type: String, default: 'DEV-', uppercase: true, trim: true },
    sequenceDevis: { type: Number, default: 1 },
    
    prefixeVente: { type: String, default: 'VTE-', uppercase: true, trim: true },
    sequenceVente: { type: Number, default: 1 },

    prefixeFacture: { type: String, default: 'FAC-', uppercase: true, trim: true },
    sequenceFacture: { type: Number, default: 1 },

    prefixeAchat: { type: String, default: 'ACH-', uppercase: true, trim: true },
    sequenceAchat: { type: Number, default: 1 },

    mentionsLegalesFacture: { type: String, trim: true, default: "Facture payable à réception. Aucun escompte pour paiement anticipé." },
    piedDePageDevis: { type: String, trim: true, default: "Devis valable 30 jours." },

    // --- Paramètres comptables ---
    exerciceCourant: { type: Schema.Types.ObjectId, ref: 'Exercice', required: true },
    journalVentesParDefaut: { type: Schema.Types.ObjectId, ref: 'JournalComptable' },
    journalAchatsParDefaut: { type: Schema.Types.ObjectId, ref: 'JournalComptable' },
    journalTresorerieParDefaut: { type: Schema.Types.ObjectId, ref: 'JournalComptable' },
  },
  { timestamps: true }
);

/**
 * Méthode statique pour obtenir les paramètres.
 * Comme c'est un singleton, cette méthode garantit que le document de paramètres
 * est créé s'il n'existe pas, et le retourne.
 */
parametresSchema.statics.get = async function() {
    let params = await this.findOne();
    if (!params) {
        // Si aucun paramètre n'existe, on pourrait en créer un avec des valeurs de base
        // ou lancer une erreur pour forcer la configuration initiale.
        // Pour l'instant, on retourne null. La logique de création sera dans un contrôleur.
        console.warn("Aucun document de paramètres trouvé dans la base de données. L'application doit être initialisée.");
        // On pourrait lancer une erreur ici pour forcer l'initialisation.
        // throw new Error("Les paramètres de l'application ne sont pas configurés.");
        return null; // ou un objet vide {}
    }
    return params;
};

const Parametres = mongoose.model('Parametres', parametresSchema);

module.exports = Parametres;