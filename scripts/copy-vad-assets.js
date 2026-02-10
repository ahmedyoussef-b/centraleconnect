// scripts/copy-vad-assets.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const ASSETS = [
    {
        pkg: '@ricky0123/vad-web',
        paths: ['dist/vad.worklet.js'],
        dest: 'vad.worklet.js'
    },
    {
        pkg: 'onnxruntime-web',
        // The SIMD-enabled WASM is generally preferred for performance
        paths: ['dist/ort-wasm-simd.wasm', 'dist/ort-wasm.wasm'],
        dest: 'onnx-runtime-web.wasm'
    }
];

const SILERO_MODEL_URL = 'https://github.com/snakers4/silero-vad/raw/master/silero_vad.onnx';
const SILERO_MODEL_DEST = 'silero_vad.onnx';


function findPackagePath(packageName, fromPath) {
    try {
        const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [fromPath] });
        return path.dirname(packageJsonPath);
    } catch (e) {
        console.error(`❌ Could not find package '${packageName}'. Is it installed as a dependency?`);
        return null;
    }
}

function copyAsset(asset, destDir, projectRoot) {
    console.log(`\nProcessing asset for: ${asset.dest}`);
    const pkgPath = findPackagePath(asset.pkg, projectRoot);

    if (!pkgPath) {
        return false;
    }
    console.log(`  - Found package '${asset.pkg}' at: ${path.relative(projectRoot, pkgPath)}`);

    for (const p of asset.paths) {
        const srcPath = path.join(pkgPath, p);
        if (fs.existsSync(srcPath)) {
            const destPath = path.join(destDir, asset.dest);
            try {
                fs.copyFileSync(srcPath, destPath);
                console.log(`  ✅ Copied '${path.relative(projectRoot, srcPath)}' to '${path.relative(projectRoot, destPath)}'`);
                return true;
            } catch (error) {
                console.error(`  ❌ Error copying file: ${error}`);
                return false;
            }
        }
    }

    console.error(`  ❌ FATAL: Could not find any of the source files for '${asset.dest}' in package '${asset.pkg}'. Checked paths: ${asset.paths.join(', ')}`);
    return false;
}

async function downloadSileroModel(destDir) {
  const destPath = path.join(destDir, SILERO_MODEL_DEST);
  if (fs.existsSync(destPath)) {
    console.log(`\n✅ Model '${SILERO_MODEL_DEST}' already exists. Skipping download.`);
    return true;
  }

  console.log(`\n⏳ Model '${SILERO_MODEL_DEST}' not found. Downloading from ${SILERO_MODEL_URL}...`);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const getRequest = (url, callback) => {
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`  - Following redirect to ${response.headers.location}`);
                getRequest(response.headers.location, callback);
            } else {
                callback(response);
            }
        }).on('error', (err) => {
            fs.unlink(destPath, () => {}); // Clean up partial file
            reject(err);
        });
    };

    getRequest(SILERO_MODEL_URL, (response) => {
        if (response.statusCode !== 200) {
            fs.unlink(destPath, () => {}); // Clean up
            return reject(new Error(`Failed to download model, status code: ${response.statusCode}`));
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
            file.close();
            console.log(`  ✅ Downloaded '${SILERO_MODEL_DEST}' successfully.`);
            resolve(true);
        });

        file.on('error', (err) => {
            fs.unlink(destPath, () => {}); // Clean up
            reject(err);
        });
    });
  });
}


async function main() {
    console.log('--- Copying and Verifying VAD & ONNX assets for Vocal Assistant ---');

    const projectRoot = path.resolve(__dirname, '..');
    const destDir = path.join(projectRoot, 'public', 'models');

    try {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            console.log(`Created destination directory: ${path.relative(projectRoot, destDir)}`);
        }
    } catch (error) {
        console.error(`❌ Failed to create destination directory: ${error}`);
        process.exit(1);
    }

    let allAssetsReady = true;

    // Copy JS/WASM assets
    for (const asset of ASSETS) {
        if (!copyAsset(asset, destDir, projectRoot)) {
            allAssetsReady = false;
        }
    }

    // Download ONNX model
    try {
        if (!(await downloadSileroModel(destDir))) {
            allAssetsReady = false;
        }
    } catch (error) {
        console.error(`❌ FATAL: Failed to download '${SILERO_MODEL_DEST}': ${error.message}`);
        allAssetsReady = false;
    }


    if (allAssetsReady) {
        console.log('\n--- ✅ All VAD assets are ready! ---');
    } else {
        console.error('\n--- ❌ Some assets could not be prepared. The vocal assistant will not work correctly. ---');
        process.exit(1);
    }
}

main().catch((e) => {
  console.error("An unexpected error occurred:", e);
  process.exit(1);
});
