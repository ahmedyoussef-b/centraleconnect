#!/bin/bash

set -e  # Arrêter à la première erreur

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🤖 Installation des Modèles IA 100% Gratuits & Open Source  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier que curl est installé
if ! command -v curl &> /dev/null; then
    echo "❌ curl n'est pas installé. Installation requise:"
    echo "   Ubuntu/Debian: sudo apt install curl"
    echo "   macOS: brew install curl"
    exit 1
fi

# Télécharger MobileNet SSD (Apache 2.0 - Recommandé)
echo "⬇️  Téléchargement de MobileNet SSD v2 (Apache 2.0)..."
echo "   Source: Google TensorFlow Models"
echo ""

cd public/models/mobilenet-ssd

# Télécharger model.json
echo "   [1/11] model.json..."
curl -s -O https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json

# Télécharger les 10 shards binaires
for i in {1..10}; do
  echo "   [$((i+1))/11] group1-shard${i}of10.bin..."
  curl -s -O "https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/group1-shard${i}of10.bin"
done

cd ../../../

# Vérification finale
echo ""
echo "🔍 Vérification des fichiers..."
if [ ! -f "public/models/mobilenet-ssd/model.json" ]; then
  echo "❌ Échec: model.json introuvable"
  exit 1
fi

SHARD_COUNT=$(ls public/models/mobilenet-ssd/group1-shard* 2>/dev/null | wc -l)
if [ "$SHARD_COUNT" -ne 10 ]; then
  echo "❌ Échec: $SHARD_COUNT shards trouvés (10 attendus)"
  exit 1
fi

echo "✅ Succès! Tous les fichiers téléchargés:"
echo ""
ls -lh public/models/mobilenet-ssd/ | awk '{printf "   %-30s %5s\n", $9, $5}'
echo ""
echo "📁 Emplacement: public/models/mobilenet-ssd/"
echo "📜 Licence: Apache 2.0 (100% gratuit, usage commercial autorisé)"
echo ""
echo "💡 Prochaines étapes:"
echo "   1. Redémarrez votre application Next.js"
echo "   2. Testez à: http://localhost:3000/test-ai"
echo ""
