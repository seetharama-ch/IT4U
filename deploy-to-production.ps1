# Deploy Frontend to Production
# Run this script as Administrator

Write-Host "IT4U Frontend Production Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$sourceDir = "d:\Workspace\gsg-IT4U\frontend\dist"
$targetDir = "C:\inetpub\wwwroot\gsg-mecm"

# Verify source exists
if (-not (Test-Path $sourceDir)) {
    Write-Host "ERROR: Source directory not found: $sourceDir" -ForegroundColor Red
    exit 1
}

# Verify target exists
if (-not (Test-Path $targetDir)) {
    Write-Host "ERROR: Target directory not found: $targetDir" -ForegroundColor Red
    Write-Host "Creating target directory..." -ForegroundColor Yellow
    New-Item -Path $targetDir -ItemType Directory -Force
}

Write-Host "`nSource: $sourceDir" -ForegroundColor Green
Write-Host "Target: $targetDir" -ForegroundColor Green

# Backup current production (optional)
$backupDir = "C:\inetpub\wwwroot\gsg-mecm-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "`nCreating backup: $backupDir" -ForegroundColor Yellow
Copy-Item $targetDir $backupDir -Recurse -Force

# Deploy new build
Write-Host "`nDeploying new build..." -ForegroundColor Yellow
Copy-Item "$sourceDir\*" $targetDir -Recurse -Force

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Navigate to https://gsg-mecm/login" -ForegroundColor White
Write-Host "3. Verify footer shows: 'Crafted by Seetharam © GeoSoftGlobal-Surtech International'" -ForegroundColor White

# List deployed files
Write-Host "`nDeployed files:" -ForegroundColor Cyan
Get-ChildItem $targetDir -Recurse -File | Select-Object FullName, Length
