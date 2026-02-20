// prebuild-check.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification pré-build...\n');
let hasErrors = false;

// --- 1. Vérifier les pages dynamiques ---
console.log('1. Vérification des routes dynamiques...');
const problematicRoutes = [];
function checkDynamicRoutes(dir) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file.startsWith('[') && file.endsWith(']')) {
                    const pagePath = path.join(fullPath, 'page.tsx');
                    if (fs.existsSync(pagePath)) {
                        const content = fs.readFileSync(pagePath, 'utf8');
                        if (!content.includes('generateStaticParams')) {
                            problematicRoutes.push(fullPath);
                        }
                    }
                }
                checkDynamicRoutes(fullPath); // Recurse
            }
        });
    } catch(e) {
        // Ignorer les erreurs si un répertoire n'existe pas
    }
}

checkDynamicRoutes(path.join(process.cwd(), 'src/app'));

if (problematicRoutes.length > 0) {
    hasErrors = true;
    console.error('❌ Pages dynamiques sans `generateStaticParams` trouvées:');
    problematicRoutes.forEach(route => console.error(`   - ${route}`));
} else {
    console.log('   ✅ Aucune route dynamique problématique trouvée.');
}

// --- 2. Vérifier les Server Actions ---
console.log('\n2. Recherche de Server Actions...');
const serverActions = [];
function checkServerActions(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Simple check for 'use server' at the top of the file
        if (content.trim().startsWith("'use server'") || content.trim().startsWith('"use server"')) {
          serverActions.push(fullPath);
        }
      } else if (stat.isDirectory() && !fullPath.includes('node_modules')) {
        checkServerActions(fullPath);
      }
    });
  } catch (error) {
      // Ignorer les erreurs
  }
}
checkServerActions(path.join(process.cwd(), 'src'));

if (serverActions.length > 0) {
  hasErrors = true;
  console.error('❌ Server Actions trouvées (incompatibles avec `output: \'export\'`):');
  serverActions.forEach(sa => console.error(`   - ${sa}`));
} else {
    console.log('   ✅ Aucune Server Action trouvée.');
}

// --- 3. Vérifier la configuration next.config.js ---
console.log('\n3. Vérification de next.config.js...');
try {
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
        const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
        if (!nextConfigContent.includes("output: 'export'")) {
             hasErrors = true;
             console.error('⚠️  La configuration `output: \'export\'` est manquante ou incorrecte dans next.config.js.');
        } else {
             console.log('   ✅ La configuration `output: \'export\'` est correcte.');
        }
    } else {
         hasErrors = true;
         console.error('❌ Fichier next.config.js introuvable.');
    }
} catch (e) {
    hasErrors = true;
    console.error('❌ Erreur lors de la lecture de next.config.js:', e);
}


if (hasErrors) {
    console.error('\n❗️ Des problèmes ont été détectés. Veuillez les corriger avant de lancer le build Tauri.');
    process.exit(1); // Quitter avec un code d'erreur
} else {
    console.log('\n✅ Vérification pré-build terminée avec succès !');
}
