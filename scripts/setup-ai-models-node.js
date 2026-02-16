// scripts/setup-ai-models-node.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

const BASE_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/';
const FILES_TO_DOWNLOAD = [
    'model.json',
    ...Array.from({ length: 10 }, (_, i) => `group1-shard${i + 1}of10.bin`)
];

const MODELS_DIR = path.resolve(__dirname, '../public/models/mobilenet-ssd');

async function downloadFile(url, dest) {
  console.log(`   Téléchargement depuis ${url}...`);
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        https.get(response.headers.location, redirectedResponse => {
           if (redirectedResponse.statusCode !== 200) {
              return reject(new Error(`Échec du téléchargement (après redirection), statut : ${redirectedResponse.statusCode}`));
           }
           streamPipeline(redirectedResponse, fs.createWriteStream(dest))
            .then(resolve)
            .catch(reject);
        }).on('error', reject);
      } else if (response.statusCode !== 200) {
        reject(new Error(`Échec du téléchargement, statut : ${response.statusCode}`));
      } else {
        streamPipeline(response, fs.createWriteStream(dest))
          .then(resolve)
          .catch(reject);
      }
    }).on('error', reject);
  });
}

async function setupModels() {
    console.log("");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║  🤖 Installation des Modèles IA via Node.js                      ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("");

    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
        console.log(`📁 Dossier créé : ${MODELS_DIR}`);
    }

    for (const [index, fileName] of FILES_TO_DOWNLOAD.entries()) {
        const fileUrl = `${BASE_URL}${fileName}`;
        const destPath = path.join(MODELS_DIR, fileName);

        console.log(`\n[${index + 1}/${FILES_TO_DOWNLOAD.length}] Vérification de ${fileName}...`);
        
        if (fs.existsSync(destPath)) {
            console.log(`   -> ✅ Fichier déjà présent.`);
            continue;
        }

        try {
            await downloadFile(fileUrl, destPath);
            console.log(`   -> ✅ Téléchargement terminé.`);
        } catch (error) {
            console.error(`   -> ❌ Erreur lors du téléchargement de ${fileName}:`, error);
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            process.exit(1); // Stop on first error
        }
    }
    
    console.log('\n🎉 Tous les modèles IA sont téléchargés avec succès !');
}

setupModels();
