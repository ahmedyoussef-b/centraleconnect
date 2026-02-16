# scripts/update-app.ps1

Write-Host "🔄 Mise à jour de l'application CentraleConnect pour Windows" -ForegroundColor Cyan

# 1. Git pull
Write-Host "`n📥 Récupération des dernières modifications..." -ForegroundColor Yellow
git pull origin main

# 2. Nettoyage
Write-Host "`n🧹 Nettoyage des caches..." -ForegroundColor Yellow
if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }


# 3. Dépendances
Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# 4. Prisma
Write-Host "`n🗄️  Mise à jour de la base de données locale..." -ForegroundColor Yellow
npx prisma generate
npx prisma db push

# 5. Modèles IA
Write-Host "`n🤖 Mise à jour des modèles IA..." -ForegroundColor Yellow
npm run setup:ai-models

# 6. Build
Write-Host "`n🏗️  Build de l'application..." -ForegroundColor Yellow
npm run build

Write-Host "`n✅ Mise à jour terminée !" -ForegroundColor Green
Write-Host "🚀 Lancez : npm run tauri dev" -ForegroundColor Cyan
