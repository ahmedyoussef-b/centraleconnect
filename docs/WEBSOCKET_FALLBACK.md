# Architecture du Fallback WebSocket (Simulateur Client)

Ce document explique le mécanisme de fallback mis en place pour assurer que l'application de monitoring affiche des données dynamiques même lorsque le backend Tauri (et donc le connecteur OPC UA) n'est pas en cours d'exécution.

## 1. Contexte et Objectif

En mode de production normal (application de bureau Tauri), le backend Rust se connecte au système SCADA (réel ou simulé via OPC UA) et publie les données sur un bus de messagerie temps réel (Ably). Le frontend Next.js s'abonne à ce bus et affiche les données.

Cependant, lorsque l'application est déployée en tant que site web statique (par exemple sur Vercel) ou lorsque le backend Tauri n'est pas lancé en développement, aucune donnée n'est publiée sur Ably. L'interface utilisateur apparaîtrait alors figée et non fonctionnelle.

L'objectif du fallback est de **détecter l'absence de données temps réel** et de **démarrer un simulateur de données directement dans le navigateur du client** pour maintenir une expérience utilisateur dynamique et permettre la démonstration des fonctionnalités de l'interface.

## 2. Le Choix d'un Fallback Côté Client

Contrairement à une approche traditionnelle avec un serveur WebSocket dédié en Node.js, nous avons opté pour un fallback entièrement **côté client** pour les raisons suivantes :

-   **Compatibilité Serverless** : Les plateformes modernes comme Vercel sont conçues pour des applications "serverless", où il n'y a pas de serveur Node.js tournant en continu. La mise en place d'un serveur WebSocket nécessiterait une infrastructure distincte et plus complexe.
-   **Simplicité et Coût** : Un simulateur côté client ne nécessite aucune infrastructure serveur supplémentaire. Il utilise les ressources du navigateur de l'utilisateur.
-   **Architecture Existante** : L'application utilise déjà Ably comme un "pont" WebSocket managé. Ajouter un autre serveur WebSocket serait redondant. Le problème n'est pas l'absence d'un WebSocket, mais l'absence d'un **éditeur** (publisher) de données.

## 3. Mécanisme d'Implémentation

Le mécanisme de fallback est implémenté dans le `ScadaProvider` (`src/lib/scada/providers/scada-provider.tsx`), qui est le composant React responsable de la gestion des données SCADA.

Le flux de décision est le suivant :

1.  **Connexion à Ably** : Au démarrage, le `ScadaProvider` tente de se connecter au bus de données Ably comme d'habitude.
2.  **Temporisateur de Données** : Une fois la connexion établie, un **temporisateur de 5 secondes** est lancé.
3.  **Attente de Données Réelles** : Le fournisseur attend de recevoir un premier message sur le canal `scada:data`.
    -   **Si un message est reçu** avant la fin du décompte, cela signifie que le backend Rust est actif. Le temporisateur est annulé, et l'application fonctionne en mode **Temps Réel**.
    -   **Si aucun message n'est reçu** après 5 secondes, le fournisseur conclut que le backend est inactif.
4.  **Activation du Fallback** :
    *   Le `ScadaProvider` instancie et démarre le `SyntheticDataProvider` (`src/lib/scada/simulation/synthetic-data-provider.ts`).
    *   Ce simulateur commence à générer des données synthétiques à intervalle régulier, directement dans le navigateur.
    *   L'interface utilisateur est mise à jour avec ces données simulées, et un indicateur visuel (sur la page de diagnostic) informe l'utilisateur que l'application est en mode **Simulateur Client**.

5.  **Priorité aux Données Réelles** : Si, à n'importe quel moment, un message réel du backend parvient (par exemple, si l'application Tauri est lancée après le navigateur), le `ScadaProvider` arrête immédiatement le simulateur client et bascule sur la source de données temps réel.

Cette architecture garantit que l'application est toujours fonctionnelle et démonstrative, tout en privilégiant toujours les données authentiques dès qu'elles sont disponibles. Elle est résiliente, efficace et parfaitement adaptée à un déploiement hybride (desktop + web).
