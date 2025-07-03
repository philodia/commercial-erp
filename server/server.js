// Importer l'application Express configurée depuis app.js
const app = require('./app');

// Importer la fonction de connexion à la base de données
const connectDB = require('./config/database');

// --- GESTION DES ERREURS NON CAPTURÉES ---
// Permet de capturer les erreurs de programmation synchrones non gérées.
// Doit être défini avant tout autre code pour être efficace.
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// --- CONNEXION À LA BASE DE DONNÉES ---
// Lancer la connexion à MongoDB. Le serveur ne démarrera pas si la connexion échoue,
// car la fonction connectDB contient un process.exit(1) en cas d'erreur.
connectDB();

// --- DÉMARRAGE DU SERVEUR ---

// Définir le port d'écoute. Utilise la variable d'environnement PORT si elle existe,
// sinon, utilise le port 5000 par défaut.
const PORT = process.env.PORT || 5000;

// Démarrer le serveur et écouter sur le port défini.
// app.listen() retourne une instance du serveur que nous stockons dans une variable.
const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});


// --- GESTION DES ERREURS ASYNCHRONES GLOBALES ---
// Permet de capturer les rejets de promesses qui n'ont pas été attrapés avec un .catch()
// Ex: une erreur dans une base de données distante sans gestion d'erreur.
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Fermer le serveur de manière "gracieuse" (gracefully) :
  // 1. On arrête d'accepter de nouvelles requêtes.
  // 2. On attend que les requêtes en cours se terminent.
  // 3. Ensuite, on arrête le processus de l'application.
  server.close(() => {
    process.exit(1); // 1 indique une sortie avec erreur
  });
});