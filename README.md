# ERP de Gestion Commerciale & Comptabilité pour PME au Sénégal

![Banner](https://via.placeholder.com/1200x300.png?text=ERP+Gestion+Commerciale+-+Sénégal)

Ce projet est une application web complète de gestion commerciale et comptable, conçue spécifiquement pour les PME/TPE au Sénégal. L'objectif est de digitaliser et d'automatiser la gestion des ventes, des achats, des stocks, des clients, des fournisseurs et de la comptabilité générale, tout en fournissant des tableaux de bord en temps réel pour une prise de décision éclairée.

## ✨ Principales Fonctionnalités

*   **Gestion Commerciale** : Devis, commandes, facturation (y compris récurrente), gestion des clients (CRM), et suivi des ventes.
*   **Gestion des Stocks** : Gestion multi-dépôts, alertes de seuil, mouvements de stock, inventaires et support des codes-barres.
*   **Gestion Comptable** : Plan comptable personnalisable (SYSCOHADA), saisie d'écritures, journaux automatisés, grand livre, balance, bilan et compte de résultat.
*   **Gestion des Achats** : Suivi des fournisseurs, commandes d'achat, et gestion des livraisons.
*   **Tableaux de Bord & Rapports** : KPIs financiers et commerciaux, graphiques interactifs, et exports en PDF/Excel.
*   **Localisation Sénégal** : Gestion de la TVA à 18%, devise FCFA (XOF), et conformité avec les mentions légales des factures.

## 🛠️ Stack Technique

| Domaine         | Technologies                                     |
| --------------- | ------------------------------------------------ |
| **Frontend**    | React.js 18+, Bootstrap 5, Chart.js/Recharts     |
| **Backend**     | Node.js, Express.js                              |
| **Base de Données** | MongoDB avec Mongoose                            |
| **Authentification**| JWT (JSON Web Token) + Contrôle d'accès par rôle |
| **Architecture**  | API RESTful, MVC, WebSockets (temps réel)        |

## 🚀 Démarrage Rapide

Suivez ces étapes pour mettre en place un environnement de développement local.

### Prérequis

Assurez-vous d'avoir les outils suivants installés sur votre machine :

*   [Node.js](https://nodejs.org/) (v18 ou supérieur)
*   [Git](https://git-scm.com/)
*   [MongoDB](https://www.mongodb.com/try/download/community) (ou un compte MongoDB Atlas)

### 1. Cloner le Dépôt

```bash
git clone https://github.com/philodia/commercial-erp.git
cd commercial-erp
```

### 2. Installer les Dépendances

Cette commande unique installera les dépendances pour le projet racine, le serveur (`/server`) et le client (`/client`).

```bash
npm run install:all
```

### 3. Configurer les Variables d'Environnement

Le projet utilise des fichiers `.env` pour gérer les configurations sensibles.

1.  **Pour le serveur :**
    *   Allez dans le dossier `server/`.
    *   Copiez `../.env.example` et renommez la copie en `.env`.
    *   Ouvrez ce nouveau `server/.env` et remplissez les variables, notamment `MONGO_URI` et `JWT_SECRET`.

2.  **Pour le client :**
    *   Allez dans le dossier `client/`.
    *   Copiez `../.env.example` et renommez la copie en `.env`.
    *   Vérifiez que `REACT_APP_API_URL` correspond au port de votre serveur (par défaut `http://localhost:5000/api`).

### 4. Lancer l'Application en Mode Développement

Cette commande démarre le serveur backend et le client frontend en parallèle.

```bash
npm run dev
```

Une fois la commande exécutée :
*   🚀 Le client React sera accessible sur **`http://localhost:3000`**.
*   📡 Le serveur API sera accessible sur **`http://localhost:5000`**.

## 🏗️ Structure du Projet

Ce projet est un monorepo géré avec npm workspaces, structuré comme suit :

```
commercial-erp-senegal/
├── 📁 client/             # Application Frontend (React.js)
├── 📁 server/             # API Backend (Node.js / Express)
├── 📄 .env.example        # Modèle pour les variables d'environnement
├── 📄 .gitignore          # Fichiers ignorés par Git
├── 📄 package.json        # Scripts et configuration du projet racine
└── 📄 README.md           # Vous êtes ici
```

## 📜 Scripts Disponibles

Depuis la racine du projet, vous pouvez utiliser les scripts suivants :

*   `npm run dev`: Lance les serveurs client et backend simultanément.
*   `npm run install:all`: Installe toutes les dépendances du projet.
*   `npm run start:server`: Lance uniquement le serveur backend.
*   `npm run start:client`: Lance uniquement le client React.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez lire les directives de contribution (à créer) avant de soumettre une pull request.

## ⚖️ Licence

Ce projet est sous licence [MIT](LICENSE).