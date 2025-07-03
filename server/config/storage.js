const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Configure la stratégie de stockage des fichiers uploadés.
 * Actuellement, implémente le stockage local. Prêt à être étendu pour S3, etc.
 */

// 1. Définir le chemin de base pour les uploads
const uploadDir = path.join(__dirname, '..', 'uploads');

// 2. S'assurer que le répertoire d'upload existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 3. Configuration du stockage local avec Multer
const localSorage = multer.diskStorage({
  /**
   * destination: Définit le dossier où le fichier sera sauvegardé.
   * @param {object} req - L'objet requête Express.
   * @param {object} file - L'objet fichier uploadé.
   * @param {function} cb - Le callback à appeler avec la destination.
   */
  destination: (req, file, cb) => {
    // Tous les fichiers vont dans le dossier 'uploads/' à la racine du serveur.
    cb(null, uploadDir);
  },

  /**
   * filename: Définit le nom du fichier sauvegardé.
   * @param {object} req - L'objet requête Express.
   * @param {object} file - L'objet fichier uploadé.
   * @param {function} cb - Le callback à appeler avec le nom du fichier.
   */
  filename: (req, file, cb) => {
    // Pour éviter les conflits de noms, on crée un nom de fichier unique :
    // fieldname-timestamp.extension
    // ex: avatar-1678886400000.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

/**
 * Middleware Multer configuré.
 * @param {object} options - Options pour la configuration de Multer.
 * @param {array} options.allowedMimes - Array de types MIME autorisés (ex: ['image/jpeg', 'image/png']).
 * @param {number} [options.maxSize=5] - Taille maximale du fichier en Mo (par défaut 5 Mo).
 */
const upload = ({ allowedMimes, maxSize = 5 }) => {
  return multer({
    storage: localSorage, // Utiliser notre configuration de stockage local
    limits: {
      fileSize: maxSize * 1024 * 1024, // Convertir Mo en octets
    },
    fileFilter: (req, file, cb) => {
      // Vérifier si le type MIME du fichier est autorisé
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true); // Accepter le fichier
      } else {
        // Rejeter le fichier
        cb(new Error('Type de fichier non supporté. Types autorisés : ' + allowedMimes.join(', ')), false);
      }
    },
  });
};

module.exports = upload;