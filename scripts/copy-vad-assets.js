// scripts/copy-vad-assets.js
const fs = require('fs');
const path = require('path');

const ASSETS = [
    {
        pkg: '@ricky0123/vad-web',
        // In older versions, files were in dist. In newer ones, they are in public.
        // We check both for robustness.
        paths: ['dist/silero_vad.onnx', 'public/silero_vad.onnx'], 
        dest: 'silero_vad.onnx'
    },
    {
        pkg: '@ricky0123/vad-web',
        paths: ['dist/vad.worklet.js', 'public/vad.worklet.js'],
        dest: 'vad.worklet.js'
    },
    {
        pkg: 'onnxruntime-web',
        // The SIMD-enabled WASM is generally preferred for performance
        paths: ['dist/ort-wasm-simd.wasm', 'dist/ort-wasm.wasm'],
        dest: 'onnx-runtime-web.wasm'
    }
];

function findPackagePath(packageName, fromPath) {
    try {
        const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [fromPath] });
        return path.dirname(packageJsonPath);
    } catch (e) {
        return null;
    }
}

function copyAsset(asset, destDir, projectRoot) {
    console.log(`\nProcessing asset for: ${asset.dest}`);
    const pkgPath = findPackagePath(asset.pkg, projectRoot);

    if (!pkgPath) {
        console.error(`❌ Could not find package '${asset.pkg}'. Is it installed as a dependency?`);
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

    console.warn(`  ⚠️ Could not find any of the source files for '${asset.dest}' in package '${asset.pkg}'. Checked paths: ${asset.paths.join(', ')}`);
    return false;
}

function main() {
    console.log('--- Copying VAD & ONNX assets for Vocal Assistant ---');

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

    let success = true;
    for (const asset of ASSETS) {
        if (!copyAsset(asset, destDir, projectRoot)) {
            success = false;
        }
    }

    if (success) {
        console.log('\n--- ✅ All assets copied successfully! ---');
    } else {
        console.error('\n--- ⚠️ Some assets could not be copied. The vocal assistant might not work correctly. ---');
    }
}

main();
