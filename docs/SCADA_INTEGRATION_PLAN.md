# 📄 Plan d'Intégration SCADA

Ce document détaille les étapes concrètes pour connecter l'application de monitoring à une source de données SCADA réelle, en remplacement du simulateur actuel.

## Phase 1 : Préparation et Mapping

Cette phase consiste à préparer les informations nécessaires à la connexion et à établir une correspondance entre les identifiants de l'application et les tags du système SCADA.

### 1.1. Confirmation de l'accès OPC UA (Action Manuelle)

**Objectif :** Valider les paramètres de connexion au serveur OPC UA de la centrale.

**État :** À faire. C'est une étape cruciale qui doit être réalisée avec les équipes d'exploitation et d'ingénierie système.

**Informations à collecter :**
-   **Adresse du serveur OPC UA :** `opc.tcp://<adresse_ip>:<port>`
-   **Politique de sécurité :** (ex: `Basic256Sha256`, `None`)
-   **Mode d'authentification :** Anonyme, Nom d'utilisateur/Mot de passe, ou Certificat.
-   **Certificats :** Si nécessaire, obtenir les fichiers de certificat client (`.pem`) et clé privée (`.key`), ainsi que le certificat du serveur.
-   **Espace de noms (Namespace) :** Identifier l'index de l'espace de noms où se trouvent les tags de la centrale.
-   **Format des Tags :** Confirmer la structure exacte des `nodeId` OPC UA (ex: `ns=2;s=CCPP.TG1.PowerOutput`).

### 1.2. Génération du Mapping `external_id` ↔ Tag SCADA

**Objectif :** Créer un fichier de correspondance entre les identifiants uniques des équipements dans notre application (`external_id`) et leurs tags correspondants dans le système SCADA.

**État :** **Implémenté ✅**

Un script a été créé pour automatiser la génération d'un fichier de mapping de base. Ce script analyse toutes les données de référence (`master-data`) pour extraire les `external_id` et proposer un `scada_tag_candidate`.

**Comment l'utiliser :**
1.  Exécutez la commande suivante depuis la racine du projet :
    ```bash
    npm run generate:scada-map
    ```
2.  Cette commande génère (ou met à jour) le fichier `public/scada-mapping.json`.

**Prochaine étape :** Ce fichier généré est un **candidat**. Il doit être revu et validé manuellement par un ingénieur système pour s'assurer que chaque `scada_tag_candidate` correspond bien au tag réel dans le superviseur SCADA.

## Phase 2 : Implémentation du Connecteur

**Objectif :** Remplacer les données simulées par des données réelles provenant du serveur OPC UA.

### 2.1. Création du Service OPC UA (Backend)

-   **Logique :** Mettre en place un service (soit dans le backend Rust de Tauri, soit dans un micro-service Node.js dédié) qui se connecte au serveur OPC UA.
-   **Fonctionnalités :**
    -   Établir et maintenir une session sécurisée avec le serveur.
    -   Utiliser le fichier `scada-mapping.json` validé pour s'abonner aux changements de valeur des tags pertinents.
    -   Écouter les notifications de changement de données (`data change notifications`).

### 2.2. Publication des Données sur Ably

-   **Logique :** Lorsque le service OPC UA reçoit une mise à jour de tag, il doit immédiatement la publier sur le canal Ably `scada:data`.
-   **Format du message :** Le message doit respecter le format attendu par le front-end, par exemple `{ "TG1_POWER": 132.5, "TG1_EXHAUST_TEMP": 580.2 }`.
-   **Impact :** Cette approche découple complètement le client de l'interface SCADA. Aucune modification ne sera nécessaire sur les composants React (`<ScadaRealtime />`) car ils écoutent déjà ce canal Ably.

## Phase 3 : Validation et Déploiement

-   **Tests :** Mettre en place un environnement de test pour valider la chaîne de données complète (OPC UA → Service connecteur → Ably → Interface utilisateur).
-   **Monitoring :** Ajouter une supervision du service connecteur lui-même (état de la connexion OPC UA, latence, etc.).
-   **Déploiement :** Intégrer le service connecteur dans le processus de déploiement de l'application.
