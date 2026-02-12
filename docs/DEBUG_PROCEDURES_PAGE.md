# Analyse du Problème d'Affichage de la Page des Procédures

## 1. Problème Constaté
La page des procédures (`/procedures`) reste bloquée sur un état de chargement infini. Aucune procédure ne s'affiche, bien que les données sources semblent correctes dans `src/assets/master-data/procedures.json`.

## 2. Flux des Données et Fichiers Impliqués
Le chargement des procédures suit un chemin complexe, du fichier source jusqu'à l'interface utilisateur. Une rupture à n'importe quel maillon de cette chaîne peut causer le problème observé.

*   **a. Source des Données**:
    *   `src/assets/master-data/procedures.json`: Définit les procédures en format JSON. Le champ `steps` est un tableau d'objets.

*   **b. Initialisation de la Base de Données (Seeding)**:
    *   `scripts/seed.ts`: Lit le fichier JSON et utilise Prisma pour peupler la base de données distante (PostgreSQL).
    *   `prisma/schema.prisma`: Définit la structure de la base. Le champ `steps` du modèle `Procedure` est de type `Json?`.

*   **c. Synchronisation vers le Client (Tauri)**:
    *   `src/lib/db-service.ts` (`syncWithRemote`): Récupère les données du serveur et les insère dans la base de données locale SQLite. Le champ `steps` est stocké dans une colonne de type `TEXT`.

*   **d. Lecture depuis la Base Locale (Backend Tauri)**:
    *   `src-tauri/src/commands.rs`: La commande `get_procedures` est invoquée. Elle lit la base SQLite et renvoie les données au frontend. La structure `Procedure` en Rust définit `steps` comme `Option<String>`, ce qui est correct pour une colonne `TEXT`.

*   **e. Traitement dans le Service Frontend**:
    *   `src/lib/tauri-client.ts`: Expose la commande Tauri au code TypeScript.
    *   `src/lib/procedures-service.ts`: C'est le point central de traitement. La fonction `fetchProcedures` reçoit les données brutes de Tauri (où `steps` est une chaîne JSON) et doit les parser en objets JavaScript. **C'est le point de défaillance le plus probable.**

*   **f. Affichage dans le Composant React**:
    *   `src/app/(main)/procedures/page.tsx`: Le composant React appelle `getProcedures()`, attend la résolution de la promesse, et met à jour son état pour afficher les données. S'il y a une erreur non interceptée dans le service, la promesse peut ne jamais se résoudre, laissant le composant en état de chargement.

## 3. Analyse de la Cause Racine
Le problème vient d'une gestion fragile des données dans le service `src/lib/procedures-service.ts`. Le code tente de parser le champ `steps` (qui est une chaîne de caractères JSON) mais ne gère pas correctement tous les cas de figure (données vides, `null`, ou JSON invalide). Une erreur lors du `JSON.parse` dans la boucle `map` provoque une exception non interceptée, ce qui fait échouer la promesse `getProcedures()` et bloque l'affichage de la page.

## 4. Solution Proposée
La solution consiste à rendre la logique de parsing dans `src/lib/procedures-service.ts` plus robuste :
1.  Vérifier que le champ `steps` est bien une chaîne de caractères non vide.
2.  Utiliser un bloc `try...catch` pour chaque tentative de `JSON.parse`.
3.  En cas d'erreur ou de données invalides, assigner un tableau vide par défaut au champ `steps` de la procédure pour garantir que l'application ne plante pas.
4.  Garantir que le service retourne toujours un tableau de procédures valides, même si certaines d'entre elles ont des étapes corrompues ou manquantes.

Cette approche garantit que l'interface utilisateur recevra toujours des données exploitables et ne restera plus bloquée en état de chargement.
