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
echo -e "\n${YELLOW}🧹 Nettoyage complet des modules...${NC}"
rm -rf node_modules
rm -rf .next

# 3. Dépendances
echo -e "\n${YELLOW}📦 Installation des dépendances...${NC}"
npm install

# 4. Base de données distante
echo -e "\n${YELLOW}🗄️  Réinitialisation de la base de données distante...${NC}"
npm run seed

# 5. Modèles IA
echo -e "\n${YELLOW}🤖 Téléchargement des modèles IA...${NC}"
npm run models:download
npm run setup:ai-models

echo -e "\n${GREEN}✅ Mise à jour terminée !${NC}"
echo -e "${CYAN}🚀 Lancez : npm run tauri dev${NC}"
