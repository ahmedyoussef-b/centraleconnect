# 🚀 Guide d'Installation et de Déploiement

Ce document explique la différence entre l'environnement de développement et une version installable de l'application.

## 1. Pour les Développeurs : Travailler sur le Code

Ces commandes sont destinées aux développeurs qui modifient le code source.

### Lancement en Mode Développement
Pour lancer l'application en mode développement (avec rechargement à chaud) :
```bash
npm run tauri dev
```

### Mise à Jour de l'Environnement
Pour mettre à jour votre environnement de développement avec les dernières modifications du code :
- **Sur Linux/macOS :**
  ```bash
  ./scripts/update-app.sh
  ```
- **Sur Windows (PowerShell) :**
  ```powershell
  .\scripts\update-app.ps1
  ```

## 2. Pour les Utilisateurs : Installer l'Application

Cette procédure permet de créer un **installateur** (`.msi` pour Windows) que n'importe quel utilisateur peut exécuter pour installer l'application sur son poste, **sans avoir besoin des outils de développement**.

### Étape 1 : Créer l'Installateur

Pour compiler l'application et générer le fichier d'installation, exécutez la commande suivante à la racine du projet :

```bash
npm run tauri build
```
*Cette commande peut prendre plusieurs minutes.*

Pour simplifier sur Windows, vous pouvez utiliser le script PowerShell dédié :
```powershell
.\scripts\build.ps1
```

### Étape 2 : Trouver et Exécuter l'Installateur

Une fois la compilation terminée, l'installateur se trouvera dans le dossier suivant :
`src-tauri/target/release/bundle/msi/`

Le fichier aura un nom similaire à `ccpp-monitor_0.1.0_x64_en-US.msi`.

Transférez ce fichier `.msi` sur le PC de l'utilisateur final et double-cliquez dessus pour lancer l'installation standard de Windows.
