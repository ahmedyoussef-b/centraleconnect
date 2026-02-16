# scripts/update-app.ps1

# Définition des couleurs
$CYAN = "`e[36m"
$YELLOW = "`e[33m"
$GREEN = "`e[32m"
$NC = "`e[0m" # No Color

Write-Host "${CYAN}🔄 Mise à jour de l'application CentraleConnect${NC}"

# 1. Git pull
Write-Host ""
Write-Host "${YELLOW}📥 Récupération des dernières modifications...${NC}"
git pull origin main

# 2. Nettoyage
Write-Host ""
Write-Host "${YELLOW}🧹 Nettoyage complet des modules...${NC}"
if (Test-Path -Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path -Path ".next") { Remove-Item -Recurse -Force ".next" }

# 3. Dépendances
Write-Host ""
Write-Host "${YELLOW}📦 Installation des dépendances...${NC}"
npm install

# 4. Base de données distante
Write-Host ""
Write-Host "${YELLOW}🗄️  Réinitialisation de la base de données distante...${NC}"
npm run seed

# 5. Modèles IA
Write-Host ""
Write-Host "${YELLOW}🤖 Téléchargement des modèles IA...${NC}"
npm run models:download
npm run setup:ai-models

Write-Host ""
Write-Host "${GREEN}✅ Mise à jour terminée !${NC}"
Write-Host "${CYAN}🚀 Lancez : npm run tauri dev${NC}"
