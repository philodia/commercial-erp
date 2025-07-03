const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Schéma de l'Utilisateur
 * Définit la structure des documents utilisateur dans la collection MongoDB.
 * Inclut la validation, le hachage de mot de passe, et les méthodes liées à l'authentification.
 */
const userSchema = new mongoose.Schema(
  {
    nomComplet: {
      type: String,
      required: [true, 'Le nom complet est obligatoire.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'adresse email est obligatoire."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Veuillez fournir une adresse email valide.',
      ],
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire.'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères.'],
      select: false, // Ne jamais renvoyer le mot de passe dans les requêtes par défaut
    },
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Comptable', 'Commercial', 'Vendeur'],
        message: 'Le rôle "{VALUE}" n\'est pas supporté.',
      },
      default: 'Vendeur',
    },
    actif: {
      type: Boolean,
      default: true,
    },
    // Champs pour la réinitialisation du mot de passe
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    // Ajoute automatiquement les champs `createdAt` et `updatedAt`
    timestamps: true,
  }
);

// --- MIDDLEWARE MONGOOSE (HOOKS) ---

/**
 * Middleware "pre-save" pour hacher le mot de passe avant de sauvegarder un utilisateur.
 * Ne s'exécute que si le mot de passe a été modifié.
 */
userSchema.pre('save', async function (next) {
  // `this` fait référence au document utilisateur en cours de sauvegarde
  if (!this.isModified('motDePasse')) {
    return next();
  }

  // Générer le "sel" pour le hachage
  const salt = await bcrypt.genSalt(10);
  // Hacher le mot de passe avec le sel
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});


// --- MÉTHODES DE L'INSTANCE ---

/**
 * Méthode pour signer et générer un token JWT pour l'utilisateur.
 * @returns {string} Le token JWT signé.
 */
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Méthode pour comparer le mot de passe entré par l'utilisateur avec le hash stocké.
 * @param {string} enteredPassword - Le mot de passe en clair à vérifier.
 * @returns {Promise<boolean>} - True si les mots de passe correspondent, sinon false.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  // `this.motDePasse` est accessible ici car on est dans une méthode du modèle
  return await bcrypt.compare(enteredPassword, this.motDePasse);
};

/**
 * Méthode pour générer et hacher un token de réinitialisation de mot de passe.
 */
userSchema.methods.getResetPasswordToken = function () {
  // 1. Générer le token brut (ce qui sera envoyé par e-mail)
  const resetToken = crypto.randomBytes(20).toString('hex');

  // 2. Hacher le token et le stocker dans la base de données
  // C'est une sécurité : si la DB est compromise, les tokens ne sont pas directement utilisables.
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Définir une date d'expiration (ex: 10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  // 4. Retourner le token brut (non haché) pour l'envoyer à l'utilisateur
  return resetToken;
};


// Créer et exporter le modèle Mongoose
const User = mongoose.model('User', userSchema);

module.exports = User;