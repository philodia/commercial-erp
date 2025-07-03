const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma de la Devise.
 * Permet de gérer plusieurs devises et leurs taux de change pour les transactions
 * internationales et la comptabilité.
 */
const deviseSchema = new Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom de la devise est obligatoire (ex: "Franc CFA").'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Le code ISO de la devise est obligatoire (ex: "XOF", "EUR", "USD").'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    symbole: {
      type: String,
      required: [true, 'Le symbole de la devise est obligatoire (ex: "FCFA", "€", "$").'],
      trim: true
    },
    tauxDeChange: {
      type: Number,
      required: [true, 'Le taux de change par rapport à la devise de référence est obligatoire.'],
      default: 1,
      description: "Taux pour convertir cette devise VERS la devise de référence (ex: pour l'Euro, si 1€ = 655.957 FCFA, le taux est 655.957)."
    },
    
    estDeviseDeReference: {
      type: Boolean,
      default: false,
      description: "Indique s'il s'agit de la devise principale de l'entreprise, pour laquelle la comptabilité est tenue."
    },
    actif: {
      type: Boolean,
      default: true
    },
    creePar: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  },
  { timestamps: true }
);

/**
 * Middleware pour s'assurer qu'il ne peut y avoir qu'une seule devise de référence.
 */
deviseSchema.pre('save', async function(next) {
    if (this.isModified('estDeviseDeReference') && this.estDeviseDeReference) {
        // La devise de référence a toujours un taux de change de 1
        this.tauxDeChange = 1;
        await this.constructor.updateMany({ _id: { $ne: this._id } }, { estDeviseDeReference: false });
    }
    next();
});

// Index
deviseSchema.index({ code: 1 });

const Devise = mongoose.model('Devise', deviseSchema);

module.exports = Devise;