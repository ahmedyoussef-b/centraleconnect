# 🏗️ Architecture d'Intégration SCADA

Ce document décrit l'architecture logicielle mise en place pour intégrer les données SCADA temps réel dans l'application de monitoring, tout en assurant une flexibilité maximale pour le développement, la démonstration et la production.

L'architecture est conçue autour d'un principe fondamental : le **découplage total** entre la source de données et la couche de visualisation.

## 1. Vue d'Ensemble

L'architecture repose sur trois piliers :

1.  **Le Backend Rust (Tauri)** : Le **producteur** de données. C'est le seul composant qui sait comment se connecter à la source de données SCADA.
2.  **Le Bus de Messagerie (Ably)** : L'**intermédiaire**. Il reçoit les données du backend et les diffuse à tous les clients abonnés, sans se soucier de leur contenu.
3.  **Le Frontend (Next.js)** : Le **consommateur** de données. Il est agnostique de la source et se contente d'afficher les données qu'il reçoit du bus de messagerie.

```
[ Backend (Rust/Tauri) ] ---> [ Ably (Bus Temps Réel) ] <--- [ Frontend (Next.js) ]
 |                                |                           |
 +-- (Mode OPCUA) -> [Serveur OPC UA]                           +-- (Abonnement au canal 'scada:data')
 |                                |
 +-- (Mode DEMO) -> [Générateur interne]
```

## 2. Les Piliers en Détail

### 2.1. Backend Rust (Producteur)

-   **Rôle** : Collecter les données SCADA et les publier sur Ably.
-   **Logique de Sélection de Mode** : Au démarrage, le backend lit la variable d'environnement `SCADA_MODE` (définie dans `.env.local`).
    -   `SCADA_MODE=OPCUA` : Il active le client OPC UA, lit le fichier de mapping `public/scada-mapping.json`, se connecte au serveur OPC UA (réel ou de simulation) et s'abonne aux `nodeId` spécifiés.
    -   `SCADA_MODE=DEMO` (ou si la variable est absente) : Il active un simulateur interne qui génère des données synthétiques mais réalistes à intervalle régulier.
-   **Standardisation** : Quelle que soit la source, les données sont formatées dans une structure JSON standardisée avant d'être publiées sur le canal Ably `scada:data`.

### 2.2. Ably (Bus Temps Réel)

-   **Rôle** : Servir de canal de communication temps réel et distribué.
-   **Canal Unique** : Toute la communication SCADA transite par le canal `scada:data`.
-   **Avantages** :
    -   **Découplage** : Le frontend n'a jamais de connexion directe avec le backend industriel, ce qui est une bonne pratique de sécurité (IT/OT separation).
    -   **Scalabilité** : Ably gère la connexion de multiples clients (plusieurs instances de l'application de bureau ou web) sans impacter le backend.
    -   **Fiabilité** : Ably gère les reconnexions, la mise en mémoire tampon des messages, etc.

### 2.3. Frontend Next.js (Consommateur)

-   **Rôle** : S'abonner au canal Ably et afficher les données reçues.
-   **Hook `useScadaData`** : Toute la logique de connexion et de gestion des données est encapsulée dans ce hook React personnalisé.
    -   Il initialise une seule fois le client Ably.
    -   Il s'abonne au canal `scada:data`.
    -   Il maintient un état interne avec les dernières données reçues, l'historique récent et le statut de la connexion.
-   **Agnosticisme** : Les composants React (tableaux de bord, graphiques) qui utilisent ce hook n'ont aucune connaissance de l'OPC UA ou du simulateur. Ils reçoivent simplement un flux de données.

## 3. Transition vers la Production

Le passage de l'environnement de développement/démonstration à la production est trivial et sécurisé :

1.  Un ingénieur système valide le fichier `public/scada-mapping.json` pour qu'il corresponde aux `nodeId` du serveur OPC UA de production.
2.  Dans l'environnement de déploiement de l'application Tauri, la variable d'environnement `SCADA_MODE` est définie sur `OPCUA`, et `OPCUA_SERVER_URL` pointe vers le serveur de l'usine.
3.  **Aucune modification du code du frontend n'est nécessaire.**

Cette architecture garantit que la démo est une représentation fidèle du produit final et que le code développé est directement utilisable en production.
