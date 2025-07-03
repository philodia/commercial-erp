const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Importer les futurs modules (laissés en commentaire pour l'instant)
// const errorHandler = require('./middleware/errorHandler');
// const authRoutes = require('./routes/auth');
// const clientRoutes = require('./routes/clients');
// ... autres routes

// Charger les variables d'environnement du fichier .env
// Cela doit être fait avant d'utiliser process.env
dotenv.config({ path: './.env' });

// Initialiser l'application Express
const app = express();

// --- MIDDLEWARE ESSENTIELS ---

// 1. Activer CORS (Cross-Origin Resource Sharing)
// Permet à votre frontend React (qui tournera sur un port différent)
// de faire des requêtes à ce serveur.
app.use(cors());

// 2. Parser le corps des requêtes en JSON
// Permet à Express de comprendre le JSON envoyé par les clients.
app.use(express.json());

// 3. Parser les requêtes URL-encoded (pour les formulaires)
app.use(express.urlencoded({ extended: true }));


// --- ROUTES ---

// Route "santé" ou de test pour vérifier que l'API est bien en ligne
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API ERP Sénégal - v1.0 - En cours d\'exécution...',
  });
});

/*
 * Section pour monter les routeurs de l'API.
 * Nous utiliserons un préfixe '/api/v1' pour versionner notre API.
 * C'est une bonne pratique qui facilite les futures évolutions.
 *
 * EXEMPLE (sera décommenté plus tard) :
 * app.use('/api/v1/auth', authRoutes);
 * app.use('/api/v1/clients', clientRoutes);
 * app.use('/api/v1/produits', produitRoutes);
 *
 */


// --- GESTIONNAIRE D'ERREURS ---
// Ce middleware doit être le DERNIER middleware ajouté à la pile.
// Il attrapera toutes les erreurs qui se produisent dans les routes.
//
// EXEMPLE (sera décommenté plus tard) :
// app.use(errorHandler);


// Exporter l'application pour qu'elle puisse être utilisée par server.js
module.exports = app;