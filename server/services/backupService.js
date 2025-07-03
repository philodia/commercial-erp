const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { format } = require('date-fns');

/**
 * @class BackupService
 * @description Gère la création de sauvegardes de la base de données et des fichiers.
 */
class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    // S'assurer que le répertoire de backup existe
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Exécute une commande shell et retourne une promesse.
   * @private
   * @param {string} command - La commande à exécuter.
   * @returns {Promise<string>} - Une promesse qui se résout avec la sortie standard.
   */
  _executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Erreur d'exécution: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.warn(`Sortie d'erreur standard: ${stderr}`);
        }
        resolve(stdout);
      });
    });
  }

  /**
   * Crée un dump de la base de données MongoDB en utilisant mongodump.
   * @returns {Promise<string>} - Le chemin vers le dossier du dump créé.
   */
  async _dumpDatabase() {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const dumpPath = path.join(this.backupDir, `dump-${timestamp}`);

    // Construire la commande mongodump
    // Utilise la variable d'environnement MONGO_URI
    const command = `mongodump --uri="${process.env.MONGO_URI}" --out="${dumpPath}" --gzip`;
    
    console.log('Lancement du dump de la base de données...');
    await this._executeCommand(command);
    console.log(`Dump de la base de données terminé avec succès dans: ${dumpPath}`);
    
    return dumpPath;
  }

  /**
   * Crée une archive zip à partir d'un dossier source.
   * @private
   * @param {string} sourceDir - Le dossier à archiver.
   * @param {string} outPath - Le chemin du fichier zip de sortie.
   * @returns {Promise<void>}
   */
  _zipDirectory(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
      archive
        .directory(sourceDir, false)
        .on('error', err => reject(err))
        .pipe(stream);

      stream.on('close', () => resolve());
      archive.finalize();
    });
  }

  /**
   * Crée une sauvegarde complète (base de données + fichiers uploads) et la compresse.
   * @returns {Promise<string>} - Le chemin vers le fichier de sauvegarde final (.zip).
   */
  async creerBackupComplet() {
    let dumpPath = '';
    try {
      // 1. Dumper la base de données
      dumpPath = await this._dumpDatabase();

      // 2. Créer l'archive zip finale
      const archiveName = `backup-erp-senegal-${path.basename(dumpPath)}.zip`;
      const archivePath = path.join(this.backupDir, archiveName);
      
      console.log(`Création de l'archive zip: ${archivePath}`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = fs.createWriteStream(archivePath);

      // Ajouter le dump de la DB à l'archive
      archive.directory(dumpPath, 'database_dump');

      // Ajouter le dossier des uploads à l'archive (si nécessaire)
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        console.log('Ajout du dossier uploads à l\'archive...');
        archive.directory(uploadsDir, 'user_uploads');
      }

      await new Promise((resolve, reject) => {
          archive.on('error', err => reject(err));
          stream.on('close', () => resolve());
          archive.pipe(stream);
          archive.finalize();
      });

      console.log('Archive créée avec succès.');
      
      // 3. (Optionnel) Nettoyer le dossier de dump non compressé
      fs.rmSync(dumpPath, { recursive: true, force: true });
      
      // TODO: Envoyer l'archive vers un stockage cloud (S3, Google Cloud Storage...)
      // await this._uploadToCloud(archivePath);

      return archivePath;

    } catch (error) {
      console.error('Échec du processus de sauvegarde complet :', error);
      // Nettoyer les fichiers temporaires en cas d'échec
      if (dumpPath && fs.existsSync(dumpPath)) {
        fs.rmSync(dumpPath, { recursive: true, force: true });
      }
      throw new Error('Le processus de sauvegarde a échoué.');
    }
  }

  // TODO: Implémenter _uploadToCloud(filePath) pour envoyer sur S3, etc.
  // TODO: Implémenter une méthode de nettoyage des anciens backups.
}

module.exports = new BackupService();