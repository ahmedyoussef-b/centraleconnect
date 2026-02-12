# Analyse du Problème d'Affichage de la Page des Alarmes

## 1. Problème Constaté
La page des alarmes (`/alarms`) reste bloquée sur un état de chargement infini ou affiche une erreur `TypeError: Cannot read properties of undefined (reading 'startsWith')`. Aucune alarme ne s'affiche, même si des données existent dans la base.

## 2. Flux des Données et Fichiers Impliqués
Le chargement des alarmes suit un chemin qui part de la base de données jusqu'à l'interface. Une corruption de la structure des données à n'importe quelle étape peut causer le problème.

*   **a. Schéma de la Base de Données**:
    *   `prisma/schema.prisma`: Définit le modèle `Alarm`. Il est crucial de noter que Prisma utilise par défaut une convention `camelCase` pour les noms de champs (ex: `equipmentId`, `standardRef`).

*   **b. Route d'API (Point de défaillance)**:
    *   `src/app/api/alarms/route.ts`: C'est le point central de la panne. Cette route API récupère les données d'alarmes depuis la base via Prisma.
    *   **L'erreur** : Le code tentait de "mapper" manuellement les champs. Il essayait de lire `alarm.equipment_id` (en `snake_case`) alors que l'objet retourné par Prisma contient `alarm.equipmentId` (en `camelCase`).
    *   **Conséquence** : Pour chaque alarme, `equipmentId` devenait `undefined` dans la réponse JSON envoyée au frontend.

*   **c. Service Frontend**:
    *   `src/lib/alarms-service.ts`: La fonction `getAlarms` appelle l'API `/api/alarms`. Elle reçoit un tableau d'objets `Alarm` où `equipmentId` est `undefined`.

*   **d. Affichage dans le Composant React**:
    *   `src/app/(main)/alarms/page.tsx`: Le composant reçoit le tableau d'alarmes corrompues.
    *   La fonction `useMemo` tente ensuite de grouper les alarmes en exécutant `a.equipmentId.startsWith('TG')`.
    *   Puisque `a.equipmentId` est `undefined`, l'appel à `.startsWith()` provoque l'erreur `TypeError` qui fait planter le rendu du composant.

## 3. Analyse de la Cause Racine
La cause racine est une **incohérence de nommage (`case`)** dans la route d'API `src/app/api/alarms/route.ts`. Le développeur a supposé à tort que Prisma retournait des champs en `snake_case` (comme dans la base de données) alors que le client Prisma les convertit en `camelCase` (comme défini dans le modèle du schéma). Le code de mapping créait donc des objets invalides.

## 4. Solution Proposée
La solution consiste à supprimer la logique de mapping inutile et erronée dans `src/app/api/alarms/route.ts`. Le client Prisma retourne déjà les données dans un format directement compatible avec le type `Alarm` utilisé par le frontend.

1.  **Simplifier `src/app/api/alarms/route.ts`**: Supprimer le `.map()` et retourner directement le résultat de `prisma.alarm.findMany()`.
2.  **Conserver la Robustesse du Frontend**: Garder les vérifications `a.equipmentId && ...` dans `src/app/(main)/alarms/page.tsx` par mesure de sécurité, au cas où des données d'une autre source (Tauri) seraient incomplètes.

Cette approche corrige la source de l'erreur tout en maintenant des gardes-fous côté client.
