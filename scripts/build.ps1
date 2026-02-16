# scripts/build.ps1
# Ce script compile l'application et crée un installateur (.msi) pour Windows.

Write-Host "🏗️  Compilation de l'application et création de l'installateur..." -ForegroundColor Cyan
npm run tauri build
Write-Host "✅ Terminé! L'installateur se trouve dans le dossier src-tauri/target/release/bundle/msi/" -ForegroundColor Green
Read-Host "Appuyez sur Entrée pour fermer cette fenêtre."
