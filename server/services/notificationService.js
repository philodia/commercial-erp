const emailService = require('./emailService');
const User = require('../models/User');
// const smsService = require('./smsService'); // Futur service SMS
// const webSocketService = require('./webSocketService'); // Futur service pour les notifs en temps réel

/**
 * @class NotificationService
 * @description Gère l'orchestration des notifications aux utilisateurs via différents canaux (email, SMS, push...).
 */
class NotificationService {

  /**
   * Notifie les utilisateurs concernés qu'une facture est arrivée à échéance.
   * @param {object} facture - Le document Mongoose de la facture.
   */
  async notifierFactureEnRetard(facture) {
    try {
      await facture.populate('client');
      const client = facture.client;

      console.log(`Préparation de la notification de retard pour la facture n°${facture.numero}`);
      
      // 1. Envoyer un e-mail de relance au client
      if (client.email) {
        // Idéalement, on utiliserait un template HTML spécifique 'rappel-paiement.html'
        // Pour l'exemple, on crée le contenu ici.
        const subject = `Rappel de paiement : Facture n°${facture.numero}`;
        const text = `Bonjour ${client.nom},\n\nSauf erreur de notre part, votre facture n°${facture.numero} d'un montant de ${facture.totalTTC} ${facture.devise || 'XOF'} est arrivée à échéance le ${new Date(facture.dateEcheance).toLocaleDateString('fr-FR')}. Nous vous remercions de bien vouloir procéder à son règlement.\n\nCordialement,\nL'équipe ${process.env.APP_NAME}`;
        
        await emailService.sendSimpleEmail({ // On imagine une fonction sendSimpleEmail pour la simplicité
          to: client.email,
          subject,
          text,
        });
      }

      // 2. Notifier les utilisateurs internes (Commerciaux, Comptables)
      const utilisateursANotifier = await User.find({ role: { $in: ['Admin', 'Comptable', 'Commercial'] } });
      for (const user of utilisateursANotifier) {
         // Notif interne par email
         const subject = `Alerte : Facture en retard - ${facture.numero}`;
         const text = `L'utilisateur ${user.nomComplet} est notifié que la facture n°${facture.numero} pour le client ${client.nom} est en retard.`;
         await emailService.sendSimpleEmail({ to: user.email, subject, text });
         
         // TODO: Notif interne via WebSocket pour le dashboard
         // webSocketService.sendNotification(user._id, { message: `Facture ${facture.numero} en retard` });
      }

    } catch (error) {
      console.error(`Erreur lors de la notification de retard pour la facture n°${facture.numero}:`, error);
    }
  }

  /**
   * Notifie les gestionnaires de stock lorsqu'un produit atteint son seuil d'alerte.
   * @param {object} produit - Le document Mongoose du produit.
   */
  async notifierSeuilDeStockAtteint(produit) {
    try {
        console.log(`Préparation de la notification d'alerte de stock pour le produit ${produit.reference}`);
        
        const utilisateursANotifier = await User.find({ role: { $in: ['Admin', 'Commercial'] } }); // Ou un rôle 'Gestionnaire de Stock'
        const subject = `Alerte Stock Bas : ${produit.designation}`;
        const text = `Le produit "${produit.designation}" (Réf: ${produit.reference}) a atteint son seuil d'alerte.\n\nStock actuel: ${produit.quantiteEnStock}\nSeuil d'alerte: ${produit.seuilAlerteStock}\n\nVeuillez planifier un réapprovisionnement.`;

        for (const user of utilisateursANotifier) {
            if (user.email) {
                await emailService.sendSimpleEmail({
                    to: user.email,
                    subject,
                    text
                });
            }
            // TODO: Notif interne via WebSocket pour le dashboard
            // webSocketService.sendNotification(user._id, { message: `Stock bas pour ${produit.designation}` });
        }
    } catch (error) {
        console.error(`Erreur lors de la notification d'alerte stock pour le produit ${produit.reference}:`, error);
    }
  }

  /**
   * Notifie un client que sa commande a été expédiée.
   * @param {object} bonLivraison - Le document Mongoose du bon de livraison.
   */
  async notifierCommandeExpediee(bonLivraison) {
     try {
        await bonLivraison.populate('client');
        const client = bonLivraison.client;

        if (client.email) {
            const subject = `Votre commande n°${bonLivraison.venteLiee.numeroVente} a été expédiée !`;
            const text = `Bonjour ${client.nom},\n\nBonne nouvelle ! Votre commande vient d'être expédiée.\nNuméro de suivi: ${bonLivraison.numeroSuivi || 'N/A'}\nTransporteur: ${bonLivraison.transporteur || 'N/A'}\n\nL'équipe ${process.env.APP_NAME}`;
            await emailService.sendSimpleEmail({ to: client.email, subject, text });
        }
        // TODO: Envoyer un SMS si le numéro de téléphone est disponible
        // if (client.telephone) {
        //     await smsService.send(client.telephone, `Votre commande ${bonLivraison.venteLiee.numeroVente} a été expédiée. Suivi: ${bonLivraison.numeroSuivi}`);
        // }
     } catch (error) {
         console.error(`Erreur lors de la notification d'expédition pour le BL n°${bonLivraison.numero}:`, error);
     }
  }
}

// Pour la simplicité, on ajoute une méthode `sendSimpleEmail` à notre `emailService`.
// Idéalement, on aurait des templates dédiés pour chaque notification.
emailService.sendSimpleEmail = async function({ to, subject, text }) {
    await sendEmail({
        to,
        subject,
        text,
        html: `<p>${text.replace(/\n/g, '<br>')}</p>` // Conversion simple du texte en HTML
    });
};

module.exports = new NotificationService();