// scripts/copy-vad-assets.js
const fs = require('fs');
const path = require('path');

/**
 * This script copies the necessary assets for the @ricky0123/vad-web library
 * from node_modules to the public/models directory.
 * This is required for Next.js to be able to serve these files to the browser.
 */
function copyVoskAssets() {
    console.log('Copying VAD assets for vocal assistant...');
    try {
        // Find the source directory of the @ricky0123/vad-web package
        const vadPackagePath = require.resolve('@ricky0123/vad-web/package.json');
        const vadSrcDir = path.join(path.dirname(vadPackagePath), 'dist');

        // Define the destination directory in the public folder
        const destDir = path.resolve(__dirname, '..', 'public', 'models');

        // Ensure the destination directory exists
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const filesToCopy = [
            'vad.worklet.js',
            'silero_vad.onnx',
            'onnx-runtime-web.wasm'
        ];

        filesToCopy.forEach(file => {
            const srcFile = path.join(vadSrcDir, file);
            const destFile = path.join(destDir, file);
            if (fs.existsSync(srcFile)) {
                fs.copyFileSync(srcFile, destFile);
                console.log(`✅ Copied ${file} to public/models/`);
            } else {
                console.warn(`⚠️ Source file not found, skipping: ${srcFile}`);
            }
        });
        console.log('VAD assets copied successfully.');

    } catch (e) {
        console.error('❌ Failed to copy VAD assets. The vocal assistant might not work correctly.');
        if (e instanceof Error) {
            console.error(e.message);
        } else {
            console.error(e);
        }
    }
}

copyVoskAssets();
