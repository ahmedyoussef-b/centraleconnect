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
        data-external-id="{external_id_de_l_équipement}"
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

### Checksum SHA-256
Pour garantir l'intégrité et l'immuabilité des données de référence, chaque nœud P&ID possède un checksum calculé à partir de son contenu JSON. Cela permet de s'assurer que les données n'ont pas été altérées.

La logique de calcul (implémentée dans `scripts/seed-pid-assets.ts`) est la suivante :
```typescript
import { createHash } from 'crypto';

// 'node' est l'objet JSON représentant un équipement P&ID
const checksum = createHash('sha256').update(JSON.stringify(node)).digest('hex');
```
Ce `checksum` est stocké avec chaque nœud dans la base de données. Toute modification ultérieure des données d'un nœud nécessiterait un recalcul de son checksum, rendant les altérations non autorisées facilement détectables.

---

## 🚀 Prochaines Étapes Logiques

1.  **Finaliser les Schémas SVG**: Compléter le dessin des 18 fichiers SVG en se basant sur les P&ID originaux et en y intégrant les hotspots interactifs.
2.  **Connecter le Hook `usePidNavigation`**: Intégrer le hook dans la page de supervision principale pour visualiser les alarmes en temps réel sur les schémas.
3.  **Créer les Pages de Détail d'Équipement**: Développer la route ` /equipments/[id]` qui sera la destination des clics sur les hotspots, affichant une fiche détaillée pour chaque équipement.
4.  **Enrichir l'Assistant Vocal**: Ajouter une nouvelle capacité à l'assistant pour qu'il puisse interroger la base de données `FunctionalNode` et répondre à des questions comme "Où se trouve la vanne HV001A ?".
