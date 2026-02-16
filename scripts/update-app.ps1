# scripts/update-app.ps1
# Ce script met à jour l'environnement de développement sur Windows.

Write-Host "🔄 Mise à jour de l'application CentraleConnect" -ForegroundColor Cyan

# 1. Git pull
Write-Host "`n📥 Récupération des dernières modifications..." -ForegroundColor Yellow
git pull origin main

# 2. Nettoyage
Write-Host "`n🧹 Nettoyage complet des modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

# 3. Dépendances
Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# 4. Base de données distante
Write-Host "`n🗄️  Réinitialisation de la base de données distante..." -ForegroundColor Yellow
npm run seed

# 5. Modèles IA
Write-Host "`n🤖 Téléchargement des modèles IA..." -ForegroundColor Yellow
npm run models:download
npm run setup:ai-models

Write-Host "`n✅ Mise à jour terminée !" -ForegroundColor Green
Write-Host "🚀 Lancez : npm run tauri dev" -ForegroundColor Cyan
Read-Host "Appuyez sur Entrée pour continuer..."
