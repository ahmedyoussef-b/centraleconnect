# scripts/build.ps1
Write-Host "🚀 Lancement du build de l'application Tauri..." -ForegroundColor Cyan
npm run tauri build
Write-Host "✅ Build terminé ! L'installateur se trouve dans src-tauri/target/release/bundle/msi/" -ForegroundColor Green
Read-Host "Appuyez sur Entrée pour continuer..."
