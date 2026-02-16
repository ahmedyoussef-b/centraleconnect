# scripts/build.ps1
# Ce script compile l'application et crée un installateur pour Windows.

Write-Host "📦 Démarrage du processus de build pour l'installateur Windows..." -ForegroundColor Cyan

# Étape 1: Exécuter la commande de build Tauri
Write-Host "🏗️  Lancement de la compilation... (cela peut prendre plusieurs minutes)" -ForegroundColor Yellow
npm run tauri build

# Vérifier si la commande a réussi
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERREUR: La compilation a échoué." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilation terminée avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "🔎 L'installateur se trouve dans le dossier suivant :" -ForegroundColor Cyan
Write-Host "   src-tauri/target/release/bundle/msi/"
Write-Host ""
Write-Host "👉 Exécutez le fichier .msi pour installer l'application sur votre PC."
