const upload = require('../config/storage'); // Importer notre factory function de Multer
const { ErrorResponse } = require('./errorHandler');
const { HTTP_STATUS_CODES } = require('../utils/constants');

/**
 * @file upload.js
 * @description Middleware d'upload de fichiers pré-configurés pour différents cas d'usage.
 * Ce fichier utilise la configuration de base de 'config/storage.js' et la spécialise.
 */

// Configuration pour l'upload d'une image unique (avatar, logo, image de produit)
const uploadImage = upload({
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize: 5, // 5 Mo maximum
}).single('image'); // 'image' est le nom du champ du formulaire (<input type="file" name="image">)

// Configuration pour l'upload d'un document unique (PDF, DOCX...)
const uploadDocument = upload({
  allowedMimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize: 10, // 10 Mo maximum
}).single('document'); // 'document' est le nom du champ du formulaire

// Middleware personnalisé pour gérer les erreurs de Multer de manière plus propre
const handleUploadErrors = (uploadMiddleware) => (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
        if (err) {
            // Gérer les erreurs spécifiques à Multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new ErrorResponse('Le fichier est trop volumineux.', HTTP_STATUS_CODES.BAD_REQUEST));
            }
            if (err.message.includes('Type de fichier non supporté')) {
                 return next(new ErrorResponse(err.message, HTTP_STATUS_CODES.BAD_REQUEST));
            }
            // Autre erreur de Multer
            return next(new ErrorResponse(err.message, HTTP_STATUS_CODES.BAD_REQUEST));
        }
        // Si tout va bien
        next();
    });
};


module.exports = {
  // On exporte les middlewares prêts à l'emploi avec leur gestionnaire d'erreurs
  uploadImage: handleUploadErrors(uploadImage),
  uploadDocument: handleUploadErrors(uploadDocument),
};