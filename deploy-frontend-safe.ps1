# SAFE Production Deployment Script
# Creates backup BEFORE any changes, copies files WITHOUT deleting first
# Run as Administrator

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "IT4U SAFE Production Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`nERROR: Run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

$ErrorActionPreference = "Stop"

# Paths
$source = "d:\Workspace\gsg-IT4U\frontend\dist"
$target = "C:\inetpub\wwwroot\gsg-mecm"

Write-Host "`n[1/5] PRE-FLIGHT CHECKS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

# Verify source
if (-not (Test-Path "$source\index.html")) {
    Write-Host "ERROR: Source build not found!" -ForegroundColor Red
    Write-Host "Path: $source" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "[OK] Source build found: $source" -ForegroundColor Green

# Verify target directory exists
if (-not (Test-Path $target)) {
    Write-Host "Creating target directory: $target" -ForegroundColor Yellow
    New-Item -Path $target -ItemType Directory -Force | Out-Null
}
Write-Host "[OK] Target directory: $target" -ForegroundColor Green

# Show source files
Write-Host "`nSource files to deploy:" -ForegroundColor Cyan
Get-ChildItem $source -Recurse -File | ForEach-Object { 
    Write-Host "  - $($_.FullName.Replace($source, ''))" -ForegroundColor Gray 
}

Write-Host "`n[2/5] BACKUP CURRENT STATE" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

$backupDir = "C:\inetpub\wwwroot\gsg-mecm-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (Test-Path "$target\*") {
    Write-Host "Creating backup: $backupDir" -ForegroundColor Yellow
    try {
        Copy-Item $target $backupDir -Recurse -Force
        Write-Host "[OK] Backup created successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR creating backup: $_" -ForegroundColor Red
        pause
        exit 1
    }
}
else {
    Write-Host "[SKIP] No existing files to backup" -ForegroundColor Yellow
}

Write-Host "`n[3/5] DEPLOY NEW FILES" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

try {
    # Copy files (will overwrite existing)
    Copy-Item "$source\*" $target -Recurse -Force
    Write-Host "[OK] Files copied successfully!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR copying files: $_" -ForegroundColor Red
    
    if (Test-Path $backupDir) {
        Write-Host "`nAttempting rollback..." -ForegroundColor Yellow
        Copy-Item "$backupDir\*" $target -Recurse -Force
        Write-Host "[OK] Rolled back to previous version" -ForegroundColor Green
    }
    pause
    exit 1
}

Write-Host "`n[4/5] VERIFY DEPLOYMENT" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

if (Test-Path "$target\index.html") {
    Write-Host "[OK] index.html present" -ForegroundColor Green
}
else {
    Write-Host "ERROR: index.html not found after deployment!" -ForegroundColor Red
    pause
    exit 1
}

# List deployed files
$deployedFiles = Get-ChildItem $target -Recurse -File
Write-Host "`nDeployed files ($($deployedFiles.Count)):" -ForegroundColor Cyan
$deployedFiles | ForEach-Object { 
    Write-Host "  - $($_.FullName.Replace($target, ''))" -ForegroundColor Gray 
}

Write-Host "`n[5/5] RESTART IIS" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow

try {
    iisreset /noforce
    Write-Host "[OK] IIS restarted!" -ForegroundColor Green
}
catch {
    Write-Host "WARNING: IIS restart failed: $_" -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`nDeployment Summary:" -ForegroundColor Yellow
Write-Host "  Source: $source" -ForegroundColor White
Write-Host "  Target: $target" -ForegroundColor White
Write-Host "  Backup: $backupDir" -ForegroundColor White
Write-Host "  Files deployed: $($deployedFiles.Count)" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Navigate to: https://gsg-mecm/login" -ForegroundColor White
Write-Host "3. Check footer: 'Crafted by Seetharam © GeoSoftGlobal-Surtech International'" -ForegroundColor White

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
