# 📖 Documentation d'Intégration — Master Data P&ID

## 🎯 Objectif
Intégration complète des schémas P&ID (Piping and Instrumentation Diagram) dans l'application hybride (Tauri + Next.js 14) pour :
-   Navigation SCADA ↔ P&ID bidirectionnelle et interactive.
-   Support contextuel pour l'assistant vocal ("Où se trouve le capteur B1.GAS.DET.B1 ?").
-   Enrichissement du journal de bord réglementaire avec des références P&ID.
-   Assurer la conformité avec les normes industrielles (ISO 55001, IEC 61511, EU IED).

---

## ✅ Conformité Normative

L'architecture d'intégration des données P&ID respecte plusieurs normes industrielles critiques :

| Norme     | Implémentation                                                              |
| :-------- | :-------------------------------------------------------------------------- |
| ISO 55001 | Traçabilité via checksum, approbation formelle (`approved_by`, `approved_at`). |
| IEC 61511 | Identification des zones de sécurité (`fire_zone`) et des équipements critiques. |
| EU IED    | Supporte la traçabilité pour le journal réglementaire embarqué et hors-ligne. |
---

## ⚙️ Architecture d'Intégration

L'intégration des données P&ID est basée sur une chaîne de validation et de traitement de données maîtres, garantissant l'intégrité et la traçabilité.

1.  **Source de Données (Master Data)**: Des fichiers JSON et CSV (`src/assets/master-data/`) servent de source de vérité unique pour tous les équipements.
2.  **Validation & Injection (Tauri)**: Au démarrage, le service `db-service.ts` valide l'intégrité des données maîtres et les injecte dans la base de données SQLite locale.
3.  **Visualisation (React)**: Le composant `<PidViewer />` charge dynamiquement les fichiers SVG correspondants et les rend interactifs.
4.  **Interactivité (Hooks)**: Le hook `usePidNavigation` gère la logique de mise en surbrillance des éléments SVG en fonction des alarmes SCADA.

---

## 📋 Checklist d'Intégration et Livrables

### 1. Structure de Données
-   **`src/assets/master-data/pid-assets.json`**: Fichier central contenant les 38 nœuds fonctionnels P&ID extraits des documents. Il inclut les métadonnées complètes (système, type, paramètres, etc.).
-   **`src/assets/master-data/pid-tags.csv`**: Table de correspondance entre les tags P&ID courts (ex: `DF002`) et les identifiants uniques (`external_id`).
-   **`prisma/schema.prisma`**: Schéma de base de données définissant le modèle `FunctionalNode`, qui structure la manière dont les données P&ID sont stockées.

### 2. Script de Référence pour l'Injection
-   **`scripts/seed-pid-assets.ts`**: Script TypeScript de référence pour un environnement serveur (Node.js + Prisma). **Il n'est pas exécuté par l'application Tauri** mais sert de documentation technique. Il lit `pid-assets.json`, calcule un checksum pour chaque nœud et les injecte dans la base.

### 3. Fichiers de Schémas SVG et Structure d'Interaction
-   **`public/assets/pids/`**: Dossier contenant les 18 schémas SVG, organisés par système (`A0`, `B1`, `B2`, `B3`).
-   **Structure interne d'un SVG** : Pour être interactif, chaque SVG doit contenir des "hotspots" (zones cliquables). Ces hotspots sont des éléments SVG (`<rect>`, `<circle>`, etc.) enrichis avec des attributs `data-*`. Il est recommandé de les grouper dans des calques (`<g>`) pour une meilleure organisation.

    ```xml
    <g id="layer-{nom_du_calque}">
      <rect 
        class="pid-hotspot"
        data-external-id="{external_id_de_l_equipement}"
        data-parameters="{paramètre1,paramètre2,paramètre3}"
      />
      <!-- ... autres hotspots ... -->
    </g>
    ```

-   **Attributs `data-*` essentiels** :
    -   `class="pid-hotspot"`: Identifie l'élément comme une zone interactive. Les styles CSS pour les états `hover` et `active` (définis dans le SVG) sont automatiquement appliqués.
    -   `data-external-id`: **Clé de liaison critique**. Doit correspondre à l'`external_id` d'un équipement dans `pid-assets.json`. C'est ce qui permet au `PidViewer` de faire le lien entre un clic sur le SVG et les données de la base.
    -   `data-parameters`: Une liste de paramètres (séparés par des virgules) liés à cet équipement. Utilisé par le hook `usePidNavigation` pour le surlignage automatique en cas d'alarme.

-   **Exemple (`B2/lubrication-filtration.svg`)**: Le fichier d'exemple existant contient déjà des styles CSS, des calques et des hotspots structurés selon ce modèle.

#### Conversion de PDF en SVG (Génération automatique)

Pour obtenir une base de travail, il est possible de convertir les P&ID originaux (souvent au format PDF) en SVG à l'aide d'outils en ligne de commande comme Inkscape.

```bash
# Utiliser Inkscape en ligne de commande
inkscape input.pdf --export-type=svg --export-filename=output.svg
```

Le fichier SVG généré devra ensuite être édité manuellement pour y ajouter la structure de calques et les "hotspots" interactifs décrits ci-dessus afin de le rendre compatible avec l'application.

### 4. Composants et Hooks React
-   **`src/components/PidViewer.tsx`**: Composant React qui :
    -   Détermine quel fichier SVG charger en fonction de l'`externalId`.
    -   Injecte le contenu SVG dans le DOM.
    -   Gère les événements de clic sur les hotspots.
    -   Applique dynamiquement des classes CSS pour le surlignage.
-   **`src/hooks/use-pid-navigation.ts`**: Hook qui :
    -   Prend en entrée une liste d'alarmes SCADA.
    -   Détermine quels hotspots SVG doivent être mis en surbrillance.
    -   Fournit une logique pour la navigation lors d'un clic.

---

## 🔐 Sécurité & Immuabilité

L'intégrité des données de référence P&ID est une pierre angulaire de la fiabilité de l'application. Elle est assurée par un double mécanisme de validation par checksum SHA-256, garantissant l'immuabilité des données depuis leur source jusqu'à leur utilisation dans l'application.

### 1. Checksum à l'Injection (Client Tauri)

C'est le mécanisme principal utilisé par l'application de bureau.

-   **Où** : La logique est implémentée dans `src/lib/db-service.ts`.
-   **Quand** : Au premier démarrage de l'application.
-   **Comment** :
    1.  Le service lit le fichier source `src/assets/master-data/pid-assets.json`.
    2.  Pour chaque nœud (équipement) dans le fichier, un checksum SHA-256 est calculé à partir du contenu JSON de l'objet du nœud.
    3.  Le nœud et son checksum sont ensuite insérés dans la base de données SQLite locale.

La logique de calcul utilise les API web standard `crypto.subtle` pour fonctionner dans l'environnement du navigateur de Tauri :

```typescript
// Logique simplifiée de src/lib/db-service.ts
const nodeString = JSON.stringify(node);
const encoder = new TextEncoder();
const data = encoder.encode(nodeString);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
// ... conversion en hexadécimal
```

### 2. Validation à l'Exécution (Client Tauri)

Pour se prémunir contre toute corruption de la base de données locale (altération manuelle, corruption de fichier), une vérification est effectuée **à chaque démarrage de l'application**.

-   **Où** : Logique implémentée dans la fonction `verifyFunctionalNodesIntegrity` de `src/lib/db-service.ts`.
-   **Comment** :
    1.  Le service charge tous les nœuds depuis la base de données SQLite.
    2.  Pour chaque nœud, il reconstruit l'objet de données original et recalcule son checksum SHA-256.
    3.  Ce checksum calculé est comparé à celui stocké en base de données.
    4.  **En cas de non-concordance, l'application s'arrête immédiatement avec une erreur critique**, empêchant toute opération sur des données non fiables.

### 3. Script de Référence pour Environnement Serveur

Le fichier `scripts/seed-pid-assets.ts` est un **script de référence** destiné à un environnement backend (Node.js + Prisma). Il n'est **pas** exécuté par l'application Tauri, mais sert de documentation et d'outil pour des cas d'usage serveur. Il utilise le module `crypto` de Node.js pour effectuer une opération de checksum similaire.

Ce triple niveau de contrôle assure une chaîne de confiance complète pour les données P&ID, depuis le fichier source jusqu'à l'affichage à l'opérateur.
---

## 🚀 Prochaines Étapes Logiques

1.  **Finaliser les Schémas SVG**: Compléter le dessin des 18 fichiers SVG en se basant sur les P&ID originaux et en y intégrant les hotspots interactifs.
2.  **Connecter le Hook `usePidNavigation`**: Intégrer le hook dans la page de supervision principale pour visualiser les alarmes en temps réel sur les schémas.
3.  **Créer les Pages de Détail d'Équipement**: Développer la route ` /equipments/[id]` qui sera la destination des clics sur les hotspots, affichant une fiche détaillée pour chaque équipement.
4.  **Enrichir l'Assistant Vocal**: Ajouter une nouvelle capacité à l'assistant pour qu'il puisse interroger la base de données `FunctionalNode` et répondre à des questions comme "Où se trouve la vanne HV001A ?".
5.  **Mettre en Place la Comparaison de Versions P&ID**:
    *   **Objectif** : Permettre l'audit et la validation des modifications apportées aux schémas P&ID.
    *   **État Actuel** : Le fichier `src/lib/pid/version-compare.ts` a été créé comme une ébauche conceptuelle.
    *   **Étapes Futures** :
        1.  Mettre en place un système de versioning pour les fichiers SVG (ex: `lubrication-filtration_v1.0.svg`, `lubrication-filtration_v1.1.svg`).
        2.  Implémenter un moteur de "diff" SVG capable de parser et de comparer structurellement deux schémas pour identifier les ajouts, suppressions et modifications d'éléments.
        3.  Créer une interface utilisateur pour visualiser ces différences de manière claire.
