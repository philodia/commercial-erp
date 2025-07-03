const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { fr } = require('date-fns/locale');

/**
 * Lit un template PDF HTML et le compile avec les données fournies.
 * Utilise un système de templating simple (remplacement de {{placeholder}}).
 * @param {string} templateName - Nom du fichier template (ex: 'facture.html').
 * @param {object} data - Données à injecter dans le template.
 * @returns {string} - Le contenu HTML compilé.
 */
const compileTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'pdf', templateName);
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Remplacer les placeholders simples (ex: {{nomClient}})
    for (const key in data) {
      if (typeof data[key] === 'string' || typeof data[key] === 'number') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
      }
    }
    return html;
  } catch (error) {
    console.error(`Erreur lors de la compilation du template PDF ${templateName}:`, error);
    throw new Error('Impossible de compiler le template PDF.');
  }
};

/**
 * Génère le HTML pour le tableau des lignes d'un document.
 * @param {Array<object>} lignes - Le tableau de lignes (devis, facture, etc.).
 * @returns {string} - Une chaîne de caractères HTML représentant les <tr> du tableau.
 */
const genererLignesTableau = (lignes) => {
    return lignes.map(ligne => `
      <tr class="item">
        <td>${ligne.description || ''}</td>
        <td>${(ligne.quantite || 0).toLocaleString('fr-FR')}</td>
        <td>${(ligne.prixUnitaireHT || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</td>
        <td>${(ligne.totalLigneApresRemiseHT || ligne.totalLigneHT || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</td>
      </tr>
    `).join('');
};


/**
 * @class PdfService
 * @description Service pour la génération de documents PDF à partir de templates HTML.
 */
class PdfService {

  /**
   * Fonction générique pour créer un PDF à partir d'un contenu HTML.
   * @param {string} htmlContent - Le contenu HTML complet à convertir.
   * @returns {Promise<Buffer>} - Une promesse qui se résout avec le buffer du PDF.
   */
  async _genererPdf(htmlContent) {
    let browser;
    try {
      browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'] // Nécessaire pour les environnements Linux/Docker
      });
      const page = await browser.newPage();
      
      // Injecter le HTML dans la page
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Générer le PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      return pdfBuffer;
    } catch (error) {
      console.error("Erreur lors de la génération du PDF avec Puppeteer:", error);
      throw new Error("La génération du PDF a échoué.");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Crée le PDF d'une facture.
   * @param {object} facture - Le document Mongoose de la facture.
   * @param {object} entreprise - L'objet des paramètres de l'entreprise.
   * @returns {Promise<Buffer>} - Le buffer du PDF.
   */
  async creerPdfFacture(facture, entreprise) {
    const data = {
      // Entreprise
      nomEntreprise: entreprise.nomEntreprise,
      adresseEntreprise: `${entreprise.adresse.rue}, ${entreprise.adresse.ville}`,
      nineaEntreprise: entreprise.ninea,
      // Client
      nomClient: facture.client.nom,
      adresseClient: `${facture.client.adresse.rue}, ${facture.client.adresse.ville}`,
      // Facture
      numeroFacture: facture.numero,
      dateEmission: format(new Date(facture.dateEmission), 'dd MMMM yyyy', { locale: fr }),
      dateEcheance: format(new Date(facture.dateEcheance), 'dd MMMM yyyy', { locale: fr }),
      // Lignes (sera injecté séparément)
      lignes: genererLignesTableau(facture.lignes),
      // Totaux
      totalHT: facture.totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }),
      totalTVA: facture.totalTVA.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }),
      totalTTC: facture.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' }),
      mentionsLegales: entreprise.mentionsLegalesFacture,
    };
    
    let html = compileTemplate('facture.html', data);
    // Injection spéciale pour le tableau qui est plus complexe
    html = html.replace('{{lignes}}', data.lignes);

    return this._genererPdf(html);
  }

  // TODO: Implémenter creerPdfDevis, creerPdfBonLivraison, etc. sur le même modèle.
}

module.exports = new PdfService();