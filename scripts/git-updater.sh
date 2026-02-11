#!/bin/bash

# Définition des couleurs
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function show_menu() {
    clear
    echo -e "${CYAN}=== 🚀 GIT AUTO UPDATER ===${NC}"
    echo -e "${YELLOW}1) 📦 Commit + Push (message auto)${NC}"
    echo -e "${YELLOW}2) ✏️  Commit + Push (message perso)${NC}"
    echo -e "${YELLOW}3) 📊 Status uniquement${NC}"
    echo -e "${YELLOW}4) ⬆️  Push sans commit${NC}"
    echo -e "${YELLOW}5) 📜 Voir l'historique${NC}"
    echo -e "${YELLOW}6) 🔄 Pull (récupérer les changements)${NC}"
    echo -e "${RED}7) ❌ Quitter${NC}"
}

while true; do
    show_menu
    read -p $'\nChoix (1-7): ' choice
    
    case $choice in
        1)
            git add --all
            date=$(date '+%d/%m/%Y %H:%M')
            git commit -m "Mise à jour $date"
            git push
            echo -e "\n${GREEN}✅ Commit + Push effectué!${NC}"
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        2)
            git add --all
            read -p "📝 Message de commit: " msg
            git commit -m "$msg"
            git push
            echo -e "\n${GREEN}✅ Commit + Push effectué!${NC}"
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            git status
            read -p $'\nAppuyez sur Entrée pour continuer...'
            ;;
        4)
            git push
            echo -e "\n${GREEN}✅ Push effectué!${NC}"
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        5)
            git log --oneline --graph --all -20
            read -p $'\nAppuyez sur Entrée pour continuer...'
            ;;
        6)
            git pull
            echo -e "\n${GREEN}✅ Pull effectué!${NC}"
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        7)
            break
            ;;
        *)
            echo -e "\n${RED}Choix invalide. Veuillez réessayer.${NC}"
            sleep 1
            ;;
    esac
done
