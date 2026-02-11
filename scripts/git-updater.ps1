#!/usr/bin/env pwsh

function Show-Menu {
    Clear-Host
    Write-Host "=== 🚀 GIT AUTO UPDATER ===" -ForegroundColor Cyan
    Write-Host "1) 📦 Commit + Push (message auto)" -ForegroundColor Yellow
    Write-Host "2) ✏️  Commit + Push (message perso)" -ForegroundColor Yellow
    Write-Host "3) 📊 Status uniquement" -ForegroundColor Yellow
    Write-Host "4) ⬆️  Push sans commit" -ForegroundColor Yellow
    Write-Host "5) 📜 Voir l'historique" -ForegroundColor Yellow
    Write-Host "6) 🔄 Pull (récupérer les changements)" -ForegroundColor Yellow
    Write-Host "7) ❌ Quitter" -ForegroundColor Red
}

do {
    Show-Menu
    $choice = Read-Host "`nChoix (1-7)"
    
    switch ($choice) {
        "1" {
            git add --all
            $date = Get-Date -Format "dd/MM/yyyy HH:mm"
            git commit -m "Mise à jour $date"
            git push
            Write-Host "✅ Commit + Push effectué!" -ForegroundColor Green
            pause
        }
        "2" {
            git add --all
            $msg = Read-Host "📝 Message de commit"
            git commit -m "$msg"
            git push
            Write-Host "✅ Commit + Push effectué!" -ForegroundColor Green
            pause
        }
        "3" {
            git status
            pause
        }
        "4" {
            git push
            Write-Host "✅ Push effectué!" -ForegroundColor Green
            pause
        }
        "5" {
            git log --oneline --graph --all -20
            pause
        }
        "6" {
            git pull
            Write-Host "✅ Pull effectué!" -ForegroundColor Green
            pause
        }
    }
} while ($choice -ne "7")
