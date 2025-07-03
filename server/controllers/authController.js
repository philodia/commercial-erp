const crypto = require('crypto');
const User = require('../models/User');
const { ErrorResponse } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/helpers');
const { HTTP_STATUS_CODES } = require('../utils/constants');
const emailService = require('../services/emailService');

/**
 * Génère un token, crée un cookie sécurisé et envoie la réponse.
 * @param {object} user - Le document utilisateur Mongoose.
 * @param {number} statusCode - Le code de statut HTTP de la réponse.
 * @param {object} res - L'objet réponse Express.
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Créer le token JWT
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Le cookie n'est pas accessible via le JS du client
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true; // N'envoyer le cookie qu'en HTTPS
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token, role: user.role, name: user.nomComplet });
};

// @desc    Inscrire un nouvel utilisateur
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { nomComplet, email, motDePasse, role } = req.body;

  // Créer l'utilisateur
  const user = await User.create({ nomComplet, email, motDePasse, role });
  
  // Envoyer un e-mail de bienvenue (sans bloquer la réponse)
  emailService.sendWelcomeEmail(user).catch(err => console.error("Erreur d'envoi de l'email de bienvenue:", err));

  sendTokenResponse(user, HTTP_STATUS_CODES.CREATED, res);
});


// @desc    Connecter un utilisateur
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, motDePasse } = req.body;

  // Valider que l'email et le mot de passe sont présents
  if (!email || !motDePasse) {
    return next(new ErrorResponse('Veuillez fournir un email et un mot de passe', HTTP_STATUS_CODES.BAD_REQUEST));
  }

  // Trouver l'utilisateur et inclure le mot de passe pour la comparaison
  const user = await User.findOne({ email }).select('+motDePasse');

  if (!user) {
    return next(new ErrorResponse('Identifiants invalides', HTTP_STATUS_CODES.UNAUTHORIZED));
  }

  // Vérifier si le mot de passe correspond
  const isMatch = await user.matchPassword(motDePasse);

  if (!isMatch) {
    return next(new ErrorResponse('Identifiants invalides', HTTP_STATUS_CODES.UNAUTHORIZED));
  }
  
  sendTokenResponse(user, HTTP_STATUS_CODES.OK, res);
});


// @desc    Obtenir l'utilisateur actuellement connecté
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  // req.user est attaché par le middleware `protect`
  res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: req.user });
});

// @desc    Déconnecter l'utilisateur
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // expire dans 10s
        httpOnly: true
    });

    res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: {}
    });
});


// @desc    Mot de passe oublié
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    // Toujours envoyer une réponse positive pour ne pas révéler si un email existe
    if (!user) {
      return res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: 'Un e-mail a été envoyé si un compte avec cet e-mail existe.' });
    }
    
    // Obtenir le token de réinitialisation
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Créer l'URL de réinitialisation
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;
    const message = `Vous recevez cet email car vous (ou quelqu'un d'autre) avez demandé la réinitialisation de votre mot de passe. Veuillez faire une requête PUT vers : \n\n ${resetUrl}`;
    
    try {
        await emailService.sendPasswordResetEmail(user, resetUrl);
        res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: 'Un e-mail a été envoyé.' });
    } catch (err) {
        console.error(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorResponse('L\'envoi de l\'e-mail a échoué', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR));
    }
});


// @desc    Réinitialiser le mot de passe
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Hasher le token reçu pour le comparer à celui dans la DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() } // Vérifier que le token n'est pas expiré
    });

    if (!user) {
        return next(new ErrorResponse('Token invalide ou expiré', HTTP_STATUS_CODES.BAD_REQUEST));
    }

    // Définir le nouveau mot de passe
    user.motDePasse = req.body.motDePasse;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // Le hook pre-save va hacher le nouveau mdp

    sendTokenResponse(user, HTTP_STATUS_CODES.OK, res);
});