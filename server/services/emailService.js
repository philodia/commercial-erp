const path = require('path');
const fs = require('fs');
const sendEmail = require('../config/email'); // Notre fonction bas-niveau d'envoi

/**
 * Lit un template d'e-mail HTML et remplace les placeholders par les données fournies.
 * @param {string} templateName - Le nom du fichier de template (ex: 'welcome.html').
 * @param {object} data - Un objet où les clés sont les placeholders à remplacer (ex: {{nom}}).
 * @returns {string} Le contenu HTML du template avec les données injectées.
 */
const renderTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'email', templateName);
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Ajouter des données globales qui peuvent être utiles dans tous les templates
    const globalData = {
        appName: process.env.APP_NAME || 'ERP Sénégal',
        currentYear: new Date().getFullYear(),
        // L'URL de base du client est utile pour les liens
        clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
    };

    const allData = { ...globalData, ...data };

    for (const key in allData) {
      // Le 'g' dans la regex est crucial pour remplacer toutes les occurrences
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, allData[key]);
    }
    return html;
  } catch (error) {
    console.error(`Erreur lors du rendu du template d'e-mail ${templateName}:`, error);
    // Retourner un texte simple en cas d'échec pour ne pas faire planter l'envoi
    return `<p>Une erreur est survenue lors de la génération de cet e-mail.</p>`;
  }
};

/**
 * @class EmailService
 * @description Centralise l'envoi de tous les e-mails transactionnels de l'application.
 */
class EmailService {
  /**
   * Envoie un e-mail de bienvenue à un nouvel utilisateur.
   * @param {object} user - L'objet utilisateur contenant nomComplet et email.
   */
  async sendWelcomeEmail(user) {
    const subject = `Bienvenue sur ${process.env.APP_NAME || 'ERP Sénégal'} !`;
    
    // Les données spécifiques à ce template
    const data = {
      nom: user.nomComplet,
      // L'URL complète est construite ici, le template reste simple
      loginUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`
    };

    const html = renderTemplate('welcome.html', data);
    const text = `Bonjour ${user.nomComplet},\n\nBienvenue sur ERP Sénégal. Votre compte a été créé avec succès.\n\nL'équipe ${process.env.APP_NAME}`;

    try {
      await sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error(`Échec de l'envoi de l'e-mail de bienvenue à ${user.email}`, error);
    }
  }

  /**
   * Envoie un e-mail pour la réinitialisation du mot de passe.
   * @param {object} user - L'objet utilisateur.
   * @param {string} resetUrl - L'URL complète de réinitialisation.
   */
  async sendPasswordResetEmail(user, resetUrl) {
    const subject = 'Réinitialisation de votre mot de passe';
    const data = {
      nom: user.nomComplet,
      url: resetUrl,
    };
    // Ce template devra être créé sur le même modèle que welcome.html
    const html = renderTemplate('reset-password.html', data);
    const text = `Bonjour ${user.nomComplet},\n\nVous avez demandé une réinitialisation de mot de passe. Veuillez cliquer sur le lien suivant ou le copier dans votre navigateur pour continuer : \n\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.\n\nL'équipe ERP Sénégal`;

    try {
      await sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    } catch (error) {
        console.error(`Échec de l'envoi de l'e-mail de réinitialisation de mot de passe à ${user.email}`, error);
    }
  }

  /**
   * Envoie une facture par e-mail à un client.
   * @param {object} invoice - L'objet facture.
   * @param {Buffer} pdfBuffer - Le buffer du PDF de la facture à joindre.
   */
  async sendInvoiceEmail(invoice, pdfBuffer) {
    // S'assurer que le client est populé
    if (!invoice.client || typeof invoice.client !== 'object') {
        throw new Error('Les informations du client sont manquantes sur la facture pour l\'envoi d\'email.');
    }
    const client = invoice.client;

    const subject = `Votre facture n°${invoice.numero} de ${process.env.APP_NAME || 'ERP Sénégal'}`;
    const data = {
        nomClient: client.nom,
        numeroFacture: invoice.numero,
        montantTTC: `${invoice.totalTTC.toLocaleString('fr-FR')} ${invoice.devise || 'XOF'}`,
        dateEcheance: new Date(invoice.dateEcheance).toLocaleDateString('fr-FR'),
    };
    // Ce template devra être créé
    const html = renderTemplate('facture-envoi.html', data);
    const text = `Bonjour ${client.nom},\n\nVeuillez trouver ci-joint votre facture n°${invoice.numero}.\n\nCordialement,\nL'équipe ${process.env.APP_NAME}`;
    
    try {
      await sendEmail({
        to: client.email,
        subject,
        text,
        html,
        attachments: [{
            filename: `Facture-${invoice.numero}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
      });
    } catch (error) {
        console.error(`Échec de l'envoi de la facture n°${invoice.numero} à ${client.email}`, error);
    }
  }

  // TODO: Implémenter d'autres méthodes comme sendPaymentReminder, sendStockAlert, etc.
}

// Exporter une instance unique de la classe (Singleton pattern)
module.exports = new EmailService();