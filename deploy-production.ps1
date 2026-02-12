# Complete Production Deployment Script
# Deploys both frontend and backend to production
# Must be run as Administrator

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IT4U Production Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`nERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$ErrorActionPreference = "Stop"

# Configuration
$frontendSource = "d:\Workspace\gsg-IT4U\frontend\dist"
$frontendTarget = "C:\inetpub\wwwroot\gsg-mecm"
$backendSource = "d:\Workspace\gsg-IT4U\backend\target"
$backendTarget = "C:\IT4U\backend"

# Deploy Frontend
if (-not $BackendOnly) {
    Write-Host "`n[1/4] FRONTEND DEPLOYMENT" -ForegroundColor Yellow
    Write-Host "=========================" -ForegroundColor Yellow
    
    if (-not (Test-Path $frontendSource)) {
        Write-Host "ERROR: Frontend build not found at $frontendSource" -ForegroundColor Red
        Write-Host "Run 'npm run build' first!" -ForegroundColor Yellow
        pause
        exit 1
    }
    
    Write-Host "Source: $frontendSource" -ForegroundColor Green
    Write-Host "Target: $frontendTarget" -ForegroundColor Green
    
    # Create target if doesn't exist
    if (-not (Test-Path $frontendTarget)) {
        Write-Host "Creating target directory..." -ForegroundColor Yellow
        New-Item -Path $frontendTarget -ItemType Directory -Force | Out-Null
    }
    
    # Backup current
    $backupDir = "C:\inetpub\wwwroot\gsg-mecm-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    if (Test-Path "$frontendTarget\index.html") {
        Write-Host "Creating backup: $backupDir" -ForegroundColor Yellow
        Copy-Item $frontendTarget $backupDir -Recurse -Force
    }
    
    # Deploy
    Write-Host "Deploying frontend files..." -ForegroundColor Yellow
    try {
        Remove-Item "$frontendTarget\*" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$frontendSource\*" $frontendTarget -Recurse -Force
        Write-Host "✓ Frontend deployed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR deploying frontend: $_" -ForegroundColor Red
        pause
        exit 1
    }
}

# Deploy Backend
if (-not $FrontendOnly) {
    Write-Host "`n[2/4] BACKEND DEPLOYMENT" -ForegroundColor Yellow
    Write-Host "========================" -ForegroundColor Yellow
    
    $jarFile = Get-ChildItem "$backendSource\*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (-not $jarFile) {
        Write-Host "WARNING: Backend JAR not found at $backendSource" -ForegroundColor Yellow
        Write-Host "Skipping backend deployment. Run 'mvn clean package' if needed." -ForegroundColor Yellow
    }
    else {
        Write-Host "Found JAR: $($jarFile.Name)" -ForegroundColor Green
        Write-Host "Target: $backendTarget" -ForegroundColor Green
        
        # Create target if doesn't exist
        if (-not (Test-Path $backendTarget)) {
            Write-Host "Creating backend directory..." -ForegroundColor Yellow
            New-Item -Path $backendTarget -ItemType Directory -Force | Out-Null
        }
        
        # Stop backend service if running
        Write-Host "Checking for running backend process..." -ForegroundColor Yellow
        $javaProc = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*it4u*.jar*" }
        if ($javaProc) {
            Write-Host "Stopping backend service..." -ForegroundColor Yellow
            Stop-Process -Id $javaProc.Id -Force
            Start-Sleep -Seconds 2
        }
        
        # Deploy JAR
        Write-Host "Deploying backend JAR..." -ForegroundColor Yellow
        Copy-Item $jarFile.FullName "$backendTarget\it4u-backend.jar" -Force
        Write-Host "✓ Backend deployed successfully!" -ForegroundColor Green
    }
}

# Restart IIS
if (-not $BackendOnly) {
    Write-Host "`n[3/4] RESTARTING IIS" -ForegroundColor Yellow
    Write-Host "====================" -ForegroundColor Yellow
    
    try {
        iisreset /noforce
        Write-Host "✓ IIS restarted successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "WARNING: IIS restart failed: $_" -ForegroundColor Yellow
        Write-Host "You may need to manually restart IIS" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n[4/4] DEPLOYMENT SUMMARY" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

if (-not $BackendOnly) {
    Write-Host "✓ Frontend deployed to: $frontendTarget" -ForegroundColor Green
    Write-Host "  Files deployed:" -ForegroundColor White
    Get-ChildItem $frontendTarget -File | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
}

if (-not $FrontendOnly -and $jarFile) {
    Write-Host "✓ Backend deployed to: $backendTarget\it4u-backend.jar" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "2. Navigate to https://gsg-mecm/login" -ForegroundColor White
Write-Host "3. Verify footer shows: 'Crafted by Seetharam © GeoSoftGlobal-Surtech International'" -ForegroundColor White
Write-Host "4. Test responsive layout on mobile (F12 → Device Mode)" -ForegroundColor White

if (-not $FrontendOnly -and $jarFile) {
    Write-Host "`nTo start backend:" -ForegroundColor Yellow
    Write-Host "cd $backendTarget" -ForegroundColor White
    Write-Host "java -jar it4u-backend.jar --spring.profiles.active=prod" -ForegroundColor White
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
