# 📖 Guide de Workflow : Base de Données Hybride (Prisma + SQLite)

Ce document explique la procédure à suivre pour modifier la structure de la base de données de l'application.

## 1. Architecture

L'application utilise une architecture de base de données hybride :

1.  **Base de Données Distante (PostgreSQL)** :
    *   Gérée par **Prisma**.
    *   C'est la source de vérité pour le seeding et la synchronisation.
    *   Utilisée par les API routes Next.js (ex: `/api/provision`, `/api/sync`).

2.  **Base de Données Locale (SQLite)** :
    *   Gérée via des requêtes **SQL brutes** dans l'application de bureau Tauri (`src/lib/db-service.ts`).
    *   Permet le fonctionnement hors-ligne.
    *   Synchronisée (en lecture seule) depuis la base de données distante.

Le fichier `prisma/schema.prisma` reste la **source de vérité unique** pour la *structure* des données. Cependant, les modifications apportées à ce fichier doivent être répercutées **manuellement** dans le schéma SQL de la base de données locale.

---

## 2. Workflow de Modification de la Base de Données

Suivez ces étapes dans l'ordre pour toute modification de schéma (ajout/suppression/modification d'un champ ou d'une table).

### Étape 1 : Modifier le Schéma Prisma

Commencez toujours par modifier le fichier `prisma/schema.prisma`. C'est ici que vous définissez vos modèles de manière centralisée.

**Exemple :** Ajout d'un champ `commissioningDate` à la table `Equipment`.

```prisma
// prisma/schema.prisma

model Equipment {
  // ... autres champs
  isImmutable       Boolean  @default(false) @map("is_immutable")
  approvedBy        String?  @map("approved_by")
  approvedAt        DateTime? @map("approved_at")
  commissioningDate DateTime? @map("commissioning_date") // <-- NOUVEAU CHAMP
  checksum          String?  @unique
  // ...
}
```

### Étape 2 : Mettre à jour le Schéma SQL de la Base Locale (Action Manuelle Critique)

C'est l'étape la plus importante et la plus sensible. Vous devez traduire la modification du schéma Prisma en SQL pour la base de données SQLite.

Ouvrez le fichier `src/lib/db-service.ts` et mettez à jour la chaîne de caractères `CREATE_TABLES_SQL`.

**Exemple :** Ajout de `commissioning_date TEXT` à la table `equipments`.

```typescript
// src/lib/db-service.ts

const CREATE_TABLES_SQL = `
BEGIN;
CREATE TABLE IF NOT EXISTS equipments (
    -- ... autres colonnes
    approved_at TEXT,
    commissioning_date TEXT, -- <-- NOUVELLE COLONNE
    checksum TEXT UNIQUE,
    nominal_data TEXT
);
-- ... autres tables
COMMIT;
`;
```

**Attention :** Assurez-vous que les types de données correspondent (ex: `DateTime` dans Prisma devient `TEXT` pour stocker une date ISO en SQLite).

### Étape 3 : Mettre à jour les Types TypeScript

Modifiez les interfaces dans `src/types/db.ts` pour qu'elles correspondent à votre nouveau schéma.

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

### Étape 4 : Mettre à jour les Données et Scripts

1.  **Données de Référence (`master-data`)** : Si le nouveau champ doit être initialisé avec des données, mettez à jour les fichiers JSON correspondants dans `src/assets/master-data/`.
2.  **Script de Seeding (`scripts/seed.ts`)** : Adaptez le script pour qu'il prenne en compte le nouveau champ lors de l'alimentation de la base de données distante.

### Étape 5 : Exécuter le Seeding

Une fois les scripts mis à jour, exécutez la commande suivante pour appliquer les changements à votre base de données **distante** (PostgreSQL) :

```bash
npm run db:seed
```

### Étape 6 : Vérifier

-   **Base distante :** Vous pouvez vous connecter à votre base PostgreSQL pour vérifier que les modifications ont bien été appliquées.
-   **Base locale :** Pour la base locale, supprimez l'ancien fichier `ccpp.db` dans le dossier `src-tauri` et redémarrez l'application Tauri. Elle recréera la base de données avec le nouveau schéma SQL que vous avez défini à l'étape 2.

Ce workflow garantit que vos deux bases de données, distante et locale, restent cohérentes et fonctionnelles.
