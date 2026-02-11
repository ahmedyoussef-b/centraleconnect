#!/bin/bash

set -e

echo "🤖 Installation MobileNet SSD depuis CDN alternatif..."
mkdir -p public/models/mobilenet-ssd
cd public/models/mobilenet-ssd

# Utiliser unpkg (miroir npm)
echo "Téléchargement depuis unpkg..."
curl -O https://unpkg.com/@tensorflow-models/coco-ssd@2.2.1/dist/model.json
# ... (les shards binaires sont plus complexes à obtenir)

echo "⚠️  Alternative recommandée: utilisez @tensorflow-models/coco-ssd directement"
echo "   npm install @tensorflow-models/coco-ssd"
echo "   Voir: src/lib/vision/equipment-detector-simple.ts"

cd ../../../
