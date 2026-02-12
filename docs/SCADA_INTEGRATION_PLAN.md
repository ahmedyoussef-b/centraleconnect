# 📄 Plan d'Intégration SCADA

Ce document détaille les étapes concrètes pour connecter l'application de monitoring à une source de données SCADA temps réel.

L'architecture choisie est la suivante :
- **Un backend Rust (Tauri)** se connecte à la source de données (OPC UA ou un simulateur).
- Ce backend publie les données sur un **canal Ably** (`scada:data`).
- **Le frontend Next.js** s'abonne à ce canal pour recevoir les données et mettre à jour l'interface.

Cette approche découple totalement le frontend du backend.

## Phase 1 : Mode Démo avec Données Synthétiques (Terminée ✅)

Cette phase est **terminée**. L'objectif était de valider la chaîne de communication complète avec des données simulées.

- **[✅] Backend Rust** : Un simulateur a été implémenté dans `src-tauri/src/scada.rs`. Il s'active si `SCADA_MODE=DEMO` dans le fichier `.env.local`. Toutes les 2 secondes, il génère des valeurs réalistes (avec du bruit) pour `TG1`, `TG2` et `TV` et les publie sur le canal Ably `scada:data`.
- **[✅] Configuration** : Le fichier `.env.local` contient les variables `ABLY_API_KEY` et `SCADA_MODE`. Le `README.md` a été mis à jour pour guider l'utilisateur.
- **[✅] Frontend Next.js** : La page du tableau de bord (`/dashboard`) a été refactorisée. Elle utilise maintenant le client Ably (`src/lib/ably-client.ts`) pour s'abonner au canal et met à jour les composants `CcppDiagram` et `HistoryChart` avec les données reçues en temps réel.

**Résultat :** Le tableau de bord affiche maintenant des données dynamiques, prouvant que l'architecture temps réel est fonctionnelle.

## Phase 2 : Connexion à un Serveur OPC UA (Prochaines Étapes)

Cette phase consiste à remplacer le simulateur par une vraie connexion à un serveur OPC UA.

### 2.1. Compléter le Mapping (Action Manuelle)

**Objectif :** Valider et compléter le fichier de correspondance entre les identifiants de l'application et les tags du système SCADA.

**État :** Fichier de base généré.

- Le fichier `public/scada-mapping.json` a été généré via `npm run generate:scada-map`.
- **Action requise :** Un ingénieur système doit **valider et corriger manuellement** ce fichier pour s'assurer que chaque `scada_tag_candidate` correspond bien au `nodeId` réel du serveur OPC UA.

### 2.2. Implémenter le Mode OPC UA dans le Backend Rust

**Objectif :** Développer la logique de connexion au serveur OPC UA.

**État :** Prêt pour développement.

- **Logique à implémenter dans `src-tauri/src/scada.rs`** :
    1.  Si `SCADA_MODE=OPCUA`, lire l'`OPCUA_SERVER_URL` depuis `.env.local`.
    2.  Charger et parser le fichier `public/scada-mapping.json`.
    3.  Utiliser la crate `opcua` pour se connecter au serveur (avec gestion des certificats et de l'authentification si nécessaire).
    4.  Parcourir les `mappings` du fichier JSON et s'abonner aux `nodeId` correspondants sur le serveur OPC UA.
    5.  Dans le callback de réception des données (`data change notification`), formater un message et le publier sur le canal Ably `scada:data` en utilisant le même format que le simulateur.

### 2.3. Validation et Déploiement en Production

-   **Tests :** Mettre en place un environnement de test avec un simulateur OPC UA (comme Prosys) pour valider la chaîne de données complète.
-   **Sécurité :** Configurer les variables d'environnement pour la production avec l'URL du serveur réel, les certificats et les identifiants.
-   **Déploiement :** Déployer l'application Tauri. Le passage en production se fera simplement en changeant la variable `SCADA_MODE` en `OPCUA`. **Aucune modification du frontend ne sera nécessaire.**
