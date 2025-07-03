const ExcelJS = require('exceljs');
const { format } = require('date-fns');

/**
 * @class ExcelService
 * @description Service pour la génération de fichiers Excel (.xlsx) à partir de données JSON.
 */
class ExcelService {

  /**
   * Crée un classeur Excel, y ajoute des données et le retourne sous forme de buffer.
   * @private
   * @param {string} sheetName - Le nom de la feuille de calcul.
   * @param {Array<object>} columns - La configuration des colonnes.
   * @param {Array<object>} data - Les données à insérer.
   * @returns {Promise<Buffer>} - Une promesse qui se résout avec le buffer du fichier .xlsx.
   */
  async _creerClasseur(sheetName, columns, data) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ERP Senegal';
      workbook.lastModifiedBy = 'ERP Senegal';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet(sheetName);

      // Définir les colonnes et les en-têtes
      worksheet.columns = columns;

      // Ajouter les données
      worksheet.addRows(data);
      
      // Mettre en forme l'en-tête
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF007BFF' }, // Bleu
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      // Ajuster la largeur des colonnes
      worksheet.columns.forEach(column => {
        let max_width = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          let column_width = cell.value ? cell.value.toString().length : 10;
          if (column_width > max_width) {
            max_width = column_width;
          }
        });
        column.width = max_width < 10 ? 10 : max_width + 2;
      });

      // Écrire le classeur dans un buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error("Erreur lors de la génération du fichier Excel:", error);
      throw new Error("La génération du fichier Excel a échoué.");
    }
  }

  /**
   * Exporte une liste de clients au format Excel.
   * @param {Array<object>} clientsData - Un tableau de documents Mongoose 'Client'.
   * @returns {Promise<Buffer>} - Le buffer du fichier .xlsx.
   */
  async exporterClients(clientsData) {
    const columns = [
      { header: 'Code Client', key: 'codeClient', width: 15 },
      { header: 'Nom', key: 'nom', width: 30 },
      { header: 'Type', key: 'typeClient', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'telephone', width: 20 },
      { header: 'Ville', key: 'ville', width: 20 },
      { header: 'Solde', key: 'solde', width: 15, style: { numFmt: '#,##0.00 "XOF"' } },
      { header: 'Date Création', key: 'createdAt', width: 20 },
    ];

    const data = clientsData.map(client => ({
      codeClient: client.codeClient,
      nom: client.nom,
      typeClient: client.typeClient,
      email: client.email,
      telephone: client.telephone,
      ville: client.adresse?.ville, // Utilisation de l'optional chaining
      solde: client.solde,
      createdAt: format(new Date(client.createdAt), 'dd/MM/yyyy HH:mm'),
    }));

    return this._creerClasseur('Liste des Clients', columns, data);
  }
  
  /**
   * Exporte une liste de factures au format Excel.
   * @param {Array<object>} facturesData - Un tableau de documents Mongoose 'Facture' (populé avec le client).
   * @returns {Promise<Buffer>} - Le buffer du fichier .xlsx.
   */
  async exporterFactures(facturesData) {
      const columns = [
          { header: 'Numéro', key: 'numero', width: 15 },
          { header: 'Client', key: 'client', width: 30 },
          { header: 'Date Émission', key: 'dateEmission', width: 20 },
          { header: 'Date Échéance', key: 'dateEcheance', width: 20 },
          { header: 'Total HT', key: 'totalHT', width: 20, style: { numFmt: '#,##0.00 "XOF"' } },
          { header: 'Total TTC', key: 'totalTTC', width: 20, style: { numFmt: '#,##0.00 "XOF"' } },
          { header: 'Montant Payé', key: 'montantPaye', width: 20, style: { numFmt: '#,##0.00 "XOF"' } },
          { header: 'Statut', key: 'statut', width: 20 },
      ];
      
      const data = facturesData.map(facture => ({
          numero: facture.numero,
          client: facture.client?.nom || 'N/A', // Gérer le cas où le client n'est pas populé
          dateEmission: format(new Date(facture.dateEmission), 'dd/MM/yyyy'),
          dateEcheance: format(new Date(facture.dateEcheance), 'dd/MM/yyyy'),
          totalHT: facture.totalHT,
          totalTTC: facture.totalTTC,
          montantPaye: facture.montantPaye,
          statut: facture.statut,
      }));

      return this._creerClasseur('Export Factures', columns, data);
  }

  // TODO: Implémenter exporterProduits, exporterEcrituresComptables, etc.
}


module.exports = new ExcelService();