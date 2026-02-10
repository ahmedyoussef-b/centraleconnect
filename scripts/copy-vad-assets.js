// scripts/copy-vad-assets.js
const fs = require('fs');
const path = require('path');

/**
 * Finds the root directory of an installed npm package.
 * @param {string} packageName - The name of the package.
 * @returns {string | null} The path to the package directory or null if not found.
 */
function findPackagePath(packageName) {
    try {
        const packageJsonPath = require.resolve(`${packageName}/package.json`);
        return path.dirname(packageJsonPath);
    } catch (e) {
        console.error(`Could not find package ${packageName}. Is it installed?`);
        return null;
    }
}

/**
 * This script copies the necessary assets for @ricky0123/vad-web and its
 * dependency onnxruntime-web from node_modules to the public/models directory.
 * This is required for Next.js to be able to serve these files to the browser.
 */
function copyVADAssets() {
    console.log('Copying VAD and ONNX assets for vocal assistant...');
    const destDir = path.resolve(__dirname, '..', 'public', 'models');

    // Ensure the destination directory exists
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`Created destination directory: ${destDir}`);
    }

    // --- 1. Files from @ricky0123/vad-web ---
    const vadPackagePath = findPackagePath('@ricky0123/vad-web');
    if (vadPackagePath) {
        const vadSrcDir = path.join(vadPackagePath, 'dist');
        const vadFilesToCopy = [
            'vad.worklet.js',
            'silero_vad.onnx',
        ];

        vadFilesToCopy.forEach(file => {
            const srcFile = path.join(vadSrcDir, file);
            const destFile = path.join(destDir, file);
            if (fs.existsSync(srcFile)) {
                fs.copyFileSync(srcFile, destFile);
                console.log(`✅ Copied ${file} from @ricky0123/vad-web`);
            } else {
                console.warn(`⚠️ Source file not found, skipping: ${srcFile}`);
            }
        });
    }

    // --- 2. Files from onnxruntime-web ---
    const onnxPackagePath = findPackagePath('onnxruntime-web');
    if (onnxPackagePath) {
        const onnxSrcDir = path.join(onnxPackagePath, 'dist');
        
        // This is the file name the hook `use-vosk-recognizer` expects.
        const wasmDestName = 'onnx-runtime-web.wasm';
        
        // `ort-wasm-simd.wasm` is generally recommended for modern browsers.
        const wasmSourceName = 'ort-wasm-simd.wasm';
        
        const srcFile = path.join(onnxSrcDir, wasmSourceName);
        const destFile = path.join(destDir, wasmDestName);

        if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
            console.log(`✅ Copied ${wasmSourceName} to public/models/${wasmDestName}`);
        } else {
             // Fallback to the non-simd version if simd is not found
            const fallbackWasmSource = 'ort-wasm.wasm';
            const fallbackSrcFile = path.join(onnxSrcDir, fallbackWasmSource);
             if (fs.existsSync(fallbackSrcFile)) {
                 fs.copyFileSync(fallbackSrcFile, destFile);
                 console.log(`✅ Copied fallback ${fallbackWasmSource} to public/models/${wasmDestName}`);
             } else {
                console.warn(`⚠️ Could not find ${wasmSourceName} or ${fallbackWasmSource} in ${onnxSrcDir}. The VAD may not work.`);
             }
        }
    }

    console.log('VAD and ONNX assets copy process finished.');
}

try {
    copyVADAssets();
} catch (e) {
    console.error('❌ Failed to copy VAD assets. The vocal assistant might not work correctly.');
    if (e instanceof Error) {
        console.error(e.message);
    } else {
        console.error(e);
    }
}
