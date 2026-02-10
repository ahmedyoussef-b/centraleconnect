// scripts/download-vosk-model.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

const modelUrl = 'https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip';
const modelsDir = path.resolve(__dirname, '../public/models');
const modelFileName = 'vosk-model-small-fr-0.22.zip';
const modelPath = path.join(modelsDir, modelFileName);

async function downloadModel() {
  console.log('📦 Vérification du modèle de reconnaissance vocale Vosk...');

  if (fs.existsSync(modelPath)) {
    console.log('✅ Le modèle Vosk est déjà présent. Aucune action requise.');
    return;
  }

  console.log(`⏳ Le modèle Vosk est manquant. Téléchargement depuis ${modelUrl}...`);
  console.log("Ceci peut prendre quelques minutes en fonction de votre connexion.");

  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log(`📁 Création du dossier : ${modelsDir}`);
  }

  try {
    const response = await new Promise((resolve, reject) => {
      https.get(modelUrl, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirect
          https.get(res.headers.location, resolve).on('error', reject);
        } else {
          resolve(res);
        }
      }).on('error', reject);
    });

    if (response.statusCode !== 200) {
      throw new Error(`Échec du téléchargement, statut : ${response.statusCode}`);
    }

    await streamPipeline(response, fs.createWriteStream(modelPath));
    console.log(`✅ Modèle téléchargé et sauvegardé dans : ${modelPath}`);
    console.log("👉 Vous pouvez maintenant lancer votre serveur de développement avec 'npm run dev'.");

  } catch (error) {
    console.error('❌ Erreur lors du téléchargement du modèle Vosk :', error);
    // Clean up partial file if download failed
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
    }
    process.exit(1);
  }
}

downloadModel();
