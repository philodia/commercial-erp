const nodemailer = require('nodemailer');

/**
 * Configure et retourne un "transporter" Nodemailer.
 * Le transporter est l'objet qui est capable d'envoyer des e-mails.
 * La configuration s'adapte à l'environnement (production ou développement).
 */
const createTransporter = async () => {
  let transporter;

  // En environnement de développement, nous utilisons Ethereal pour ne pas envoyer de vrais e-mails.
  if (process.env.NODE_ENV === 'development') {
    // Crée un compte de test sur Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true pour le port 465, false pour les autres
      auth: {
        user: testAccount.user, // Utilisateur généré par Ethereal
        pass: testAccount.pass, // Mot de passe généré par Ethereal
      },
    });
  } else {
    // En production, nous utilisons les vraies informations du fichier .env
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // Typiquement true si port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  return transporter;
};


/**
 * Fonction principale pour envoyer un e-mail.
 * Elle crée le transporter, définit les options de l'e-mail et l'envoie.
 * @param {object} options - Options de l'e-mail.
 * @param {string} options.to - Destinataire de l'e-mail.
 * @param {string} options.subject - Sujet de l'e-mail.
 * @param {string} options.text - Corps de l'e-mail en texte brut.
 * @param {string} [options.html] - Corps de l'e-mail en HTML (optionnel).
 * @param {array} [options.attachments] - Tableau d'objets pour les pièces jointes.
 */
const sendEmail = async (options) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      // ==================== MISE À JOUR ICI ====================
      attachments: options.attachments,
      // =======================================================
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Message sent: %s', info.messageId);

    // Si on est en développement, on affiche l'URL de prévisualisation d'Ethereal
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // Relancer l'erreur pour que le service appelant puisse la gérer s'il le souhaite
    throw error;
  }
};

module.exports = sendEmail;