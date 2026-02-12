# FORCE Deploy with Cache Busting
# Clears IIS, removes old files, deploys fresh build
# Run as Administrator

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "IT4U FORCE Deployment (Cache Busting)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`nERROR: Run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

$ErrorActionPreference = "Stop"

$source = "d:\Workspace\gsg-IT4U\frontend\dist"
$target = "C:\inetpub\wwwroot\gsg-mecm"

Write-Host "`n[1/6] STOPPING IIS" -ForegroundColor Yellow
iisreset /stop
Write-Host "[OK] IIS stopped" -ForegroundColor Green

Write-Host "`n[2/6] BACKING UP CURRENT STATE" -ForegroundColor Yellow
$backupDir = "C:\inetpub\wwwroot\gsg-mecm-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path "$target\*") {
    Copy-Item $target $backupDir -Recurse -Force
    Write-Host "[OK] Backup: $backupDir" -ForegroundColor Green
}

Write-Host "`n[3/6] CLEARING OLD FILES" -ForegroundColor Yellow
Remove-Item "$target\*" -Recurse -Force
Write-Host "[OK] Old files removed" -ForegroundColor Green

Write-Host "`n[4/6] DEPLOYING NEW BUILD" -ForegroundColor Yellow
if (-not (Test-Path "$source\index.html")) {
    Write-Host "ERROR: Build not found!" -ForegroundColor Red
    iisreset /start
    pause
    exit 1
}

Copy-Item "$source\*" $target -Recurse -Force
Write-Host "[OK] Files deployed:" -ForegroundColor Green
Get-ChildItem $target -File | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

Write-Host "`n[5/6] VERIFYING DEPLOYMENT" -ForegroundColor Yellow
if (Test-Path "$target\index.html") {
    $htmlContent = Get-Content "$target\index.html" -Raw
    if ($htmlContent -match "index-.*\.js") {
        Write-Host "[OK] index.html valid" -ForegroundColor Green
    } else {
        Write-Host "WARNING: index.html may be corrupt" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: index.html missing!" -ForegroundColor Red
    iisreset /start
    pause
    exit 1
}

Write-Host "`n[6/6] STARTING IIS" -ForegroundColor Yellow
iisreset /start
Write-Host "[OK] IIS started" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`nIMPORTANT: Clear browser cache!" -ForegroundColor Yellow
Write-Host "1. Press Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "2. Clear 'Cached images and files'" -ForegroundColor White
Write-Host "3. Navigate to: https://gsg-mecm/login" -ForegroundColor White
Write-Host "4. Hard refresh: Ctrl+F5" -ForegroundColor White

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
