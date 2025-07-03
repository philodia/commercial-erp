const mongoose = require('mongoose');

/**
 * Établit la connexion à la base de données MongoDB.
 * Cette fonction utilise async/await pour gérer la nature asynchrone de la connexion.
 * En cas d'échec, elle affiche l'erreur et arrête le processus du serveur pour éviter
 * qu'il ne fonctionne dans un état instable (sans accès à sa base de données).
 */
const connectDB = async () => {
  try {
    // Mongoose 7+ recommande 'strictQuery: true'. C'est la valeur par défaut
    // pour des requêtes plus sûres, empêchant les requêtes sur des champs non définis.
    mongoose.set('strictQuery', true);

    // Connexion à MongoDB. Les options { useNewUrlParser, useUnifiedTopology }
    // sont obsolètes depuis Mongoose v6 car elles sont maintenant activées par défaut.
    // Les inclure génère des avertissements dans la console, nous les retirons donc.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Affiche un message de confirmation dans la console une fois la connexion réussie.
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Affiche un message d'erreur détaillé si la connexion échoue.
    console.error(`Error connecting to MongoDB: ${error.message}`);
    
    // Arrête l'application avec un code d'erreur (1) en cas d'échec de connexion.
    // C'est une bonne pratique pour empêcher l'application de continuer à fonctionner
    // sans pouvoir accéder à sa base de données.
    process.exit(1);
  }
};

module.exports = connectDB;