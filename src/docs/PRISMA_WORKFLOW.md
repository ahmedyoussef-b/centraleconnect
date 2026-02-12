# 📖 Guide de Workflow : Base de Données Hybride (Prisma + SQLite)

Ce document explique la procédure à suivre pour modifier la structure de la base de données de l'application.

## 1. Architecture

L'application utilise une architecture de base de données hybride, une approche nécessaire en raison des contraintes des outils actuels :

1.  **Base de Données Distante (PostgreSQL)** :
    *   Gérée par **Prisma**. C'est la **source de vérité** pour la structure des données.
    *   Utilisée par les API routes Next.js pour le provisionnement et la synchronisation (ex: `/api/provision`, `/api/sync`).
    *   Toute modification de schéma doit être faite dans `prisma/schema.prisma`.

2.  **Base de Données Locale (SQLite)** :
    *   Gérée via des requêtes **SQL brutes** dans l'application de bureau Tauri (`src/lib/db-service.ts`).
    *   Permet le fonctionnement hors-ligne.
    *   C'est une **copie en lecture** des données distantes (pour la plupart) et un stockage pour les données locales (journal, etc.).

**Contrainte Technique Fondamentale :**
Prisma ne peut gérer qu'un seul type de base de données (`provider`) à la fois à partir d'un seul `schema.prisma`. Puisque nous avons besoin de PostgreSQL pour la production et de SQLite pour l'embarqué, nous ne pouvons pas utiliser Prisma pour gérer directement le schéma de la base de données locale. C'est pourquoi le schéma local est maintenu manuellement.

---

## 2. Workflow de Modification de la Base de Données

Suivez ces étapes **rigoureusement** pour toute modification de schéma afin de maintenir la cohérence entre les deux bases de données.

### Étape 1 : Modifier le Schéma Prisma (Source de Vérité)

Commencez toujours par modifier le fichier `prisma/schema.prisma`. C'est le plan directeur de vos données.

**Exemple :** Ajout d'un champ `commissioningDate` à la table `Equipment`.

```prisma
// prisma/schema.prisma

model Equipment {
  // ... autres champs
  approvedAt        DateTime?  @map("approved_at")
  commissioningDate DateTime? @map("commissioning_date") // <-- NOUVEAU CHAMP
  checksum          String?    @unique
  // ...
}
```

### Étape 2 : Répercuter la Modification dans la Base Locale (Action Manuelle Critique)

C'est l'étape la plus sensible. Vous devez **traduire manuellement** la modification du schéma Prisma en SQL pour la base de données SQLite.

Ouvrez le fichier `src/lib/db-service.ts` et mettez à jour la chaîne de caractères `CREATE_TABLES_SQL`.

**Exemple :** Ajout de `commissioning_date TEXT` à la table `equipments`.

```typescript
// src/lib/db-service.ts

const CREATE_TABLES_SQL = `
BEGIN;
CREATE TABLE IF NOT EXISTS equipments (
    -- ... autres colonnes
    approved_at TEXT,
    commissioning_date TEXT, -- <-- NOUVELLE COLONNE AJOUTÉE
    checksum TEXT UNIQUE,
    nominal_data TEXT
);
-- ... autres tables
COMMIT;
`;
```

**Attention :** Assurez-vous que les types de données correspondent (ex: `DateTime` dans Prisma devient `TEXT` pour stocker une date ISO en SQLite, `Boolean` devient `BOOLEAN NOT NULL DEFAULT 0`).

### Étape 3 : Mettre à jour les Types TypeScript

Modifiez les interfaces dans `src/types/db.ts` pour qu'elles correspondent à votre nouveau schéma. C'est crucial pour que TypeScript ne signale pas d'erreurs.

**Exemple :**

```typescript
// src/types/db.ts

export interface Equipment {
  // ... autres propriétés
  approvedAt?: string;
  commissioningDate?: string; // <-- NOUVELLE PROPRIÉTÉ
  checksum?: string;
  // ...
}
```

### Étape 4 : Mettre à jour les Données et Scripts de Seeding

1.  **Données de Référence (`master-data`)** : Si le nouveau champ doit être initialisé avec des données, mettez à jour les fichiers JSON correspondants dans `src/assets/master-data/`.
2.  **Script de Seeding (`scripts/seed.ts`)** : Adaptez le script pour qu'il prenne en compte le nouveau champ lors de l'alimentation de la base de données distante.

### Étape 5 : Appliquer les Modifications

1.  **Pour la base distante (PostgreSQL)** : Exécutez la commande suivante. Elle mettra à jour le schéma de votre base distante et la remplira avec les données du script de seed.
    ```bash
    npm run db:seed
    ```
2.  **Pour la base locale (SQLite)** : La manière la plus simple de garantir que le nouveau schéma est appliqué est de **supprimer l'ancien fichier de base de données**.
    *   Allez dans le dossier `src-tauri/`.
    *   Supprimez le fichier `ccpp.db`.
    *   Redémarrez l'application Tauri (ex: `npm run tauri dev`). L'application recréera automatiquement `ccpp.db` avec le nouveau schéma que vous avez défini à l'étape 2.

Ce workflow, bien que comportant une étape manuelle, est actuellement la méthode la plus fiable pour gérer cette architecture hybride.
