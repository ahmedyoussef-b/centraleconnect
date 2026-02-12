#!/bin/bash
# scripts/update-app.sh

# Définition des couleurs
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔄 Mise à jour de l'application CentraleConnect${NC}"

# 1. Git pull
echo -e "\n${YELLOW}📥 Récupération des dernières modifications...${NC}"
git pull origin main

# 2. Nettoyage
echo -e "\n${YELLOW}🧹 Nettoyage des caches...${NC}"
rm -rf node_modules/.cache
rm -rf .next

# 3. Dépendances
echo -e "\n${YELLOW}📦 Installation des dépendances...${NC}"
npm install

# 4. Prisma
echo -e "\n${YELLOW}🗄️  Mise à jour de la base de données locale...${NC}"
# La variable DATABASE_URL est maintenant lue depuis le fichier .env.local
npx prisma generate
npx prisma db push

# 5. Modèles IA
echo -e "\n${YELLOW}🤖 Mise à jour des modèles IA...${NC}"
npm run setup:ai-models

# 6. Build
echo -e "\n${YELLOW}🏗️  Build de l'application...${NC}"
npm run build

echo -e "\n${GREEN}✅ Mise à jour terminée !${NC}"
echo -e "${CYAN}🚀 Lancez : npx tauri dev${NC}"
