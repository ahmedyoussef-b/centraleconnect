# ⚙️ Guide de Réinstallation Complète de l'Application

Ce guide détaille la procédure pour désinstaller complètement l'application (versions de bureau et de développement) et la réinstaller à partir de zéro. Suivre ces étapes garantit un environnement propre et à jour.

---

## 1. Désinstallation Complète

L'objectif est de supprimer tous les fichiers liés à l'application pour éviter tout conflit.

### Étape 1.1 : Supprimer l'application de bureau

-   **Sur Windows** :
    1.  Allez dans `Paramètres > Applications > Applications et fonctionnalités`.
    2.  Recherchez "ccpp-monitor" (ou le nom de votre application) dans la liste.
    3.  Cliquez dessus et sélectionnez **Désinstaller**.

-   **Sur macOS** :
    1.  Ouvrez le dossier `Applications`.
    2.  Trouvez "ccpp-monitor.app" (ou le nom de votre application).
    3.  Faites-le glisser vers la Corbeille.

### Étape 1.2 : Supprimer les données locales de l'application

Cette étape supprime la base de données locale SQLite et tout autre cache.
-   **Sur Windows** :
    1.  Ouvrez l'explorateur de fichiers.
    2.  Dans la barre d'adresse, tapez `%APPDATA%` et appuyez sur Entrée.
    3.  Trouvez et supprimez le dossier `com.ccpp.monitor`.

-   **Sur macOS** :
    1.  Ouvrez le Finder.
    2.  Dans le menu "Aller", sélectionnez "Aller au dossier...".
    3.  Tapez `~/Library/Application Support/` et appuyez sur Entrée.
    4.  Trouvez et supprimez le dossier `com.ccpp.monitor`.

### Étape 1.3 : Supprimer le dossier du projet

Supprimez **complètement** le dossier contenant le code source de votre projet. Cela supprimera :
-   Le code source.
-   Les dépendances (`node_modules`).
-   Les builds précédents (`out`).
-   Toute autre configuration locale.

---

## 2. Réinstallation Propre

Maintenant que l'environnement est propre, nous allons réinstaller l'application.

### Étape 2.1 : Récupérer le code source

Ouvrez un terminal et clonez à nouveau le dépôt du projet :

```bash
# Remplacez l'URL par l'URL de votre dépôt Git
git clone <URL_DU_DEPOT_GIT>
cd <NOM_DU_DOSSIER_PROJET>
```

### Étape 2.2 : Configurer l'environnement

Créez un fichier `.env.local` à la racine du projet. Ce fichier est **crucial** pour la connexion aux services externes. Copiez-y le contenu suivant et remplacez les valeurs :

```env
# .env.local

# Clé API pour la communication temps réel (obligatoire pour SCADA)
# À récupérer depuis votre compte Ably.
ABLY_API_KEY="VOTRE_CLE_API_ABLY_ICI"

# URL de la base de données distante PostgreSQL (obligatoire pour le seeding et la synchro)
# Doit inclure le mot de passe.
DATABASE_URL_REMOTE="postgresql://user:password@host:port/database"

# Mode de fonctionnement du backend SCADA: "DEMO" ou "OPCUA"
# Laissez sur "DEMO" pour commencer.
SCADA_MODE=DEMO

# URL du serveur OPC UA (utilisée uniquement si SCADA_MODE=OPCUA)
OPCUA_SERVER_URL="opc.tcp://localhost:53530/OPCUA/SimulationServer"
```

### Étape 2.3 : Installer les dépendances

Cette commande télécharge toutes les bibliothèques nécessaires au projet et rend les scripts exécutables.

```bash
npm install
```

### Étape 2.4 : Télécharger les modèles d'IA

Ces commandes téléchargent les modèles pour la reconnaissance vocale et visuelle.

```bash
# Modèle de reconnaissance vocale (Vosk)
npm run models:download

# Modèle de détection d'objets (TensorFlow.js)
npm run setup:ai-models
```

### Étape 2.5 : Initialiser la base de données distante

Cette commande va réinitialiser votre base de données PostgreSQL distante et la remplir avec les données de référence (équipements, alarmes, procédures).

```bash
npm run seed
```

### Étape 2.6 : Lancer l'application en mode développement

C'est la dernière étape. Elle compile le projet et lance l'application de bureau. Au premier lancement, la base de données SQLite locale sera créée automatiquement dans le dossier des données de l'application.

```bash
npm run tauri dev
```

Votre application est maintenant réinstallée et prête à être utilisée dans un état propre.
