# ================================
# IT4U SAFE ADMIN DEPLOY SCRIPT
# ================================

# ---- CONFIG ----
$FrontendBuildPath = "D:\Workspace\gsg-IT4U\frontend\dist"
$IisSitePath       = "C:\inetpub\wwwroot\gsg-mecm"
$BackupRoot        = "C:\inetpub\wwwroot"
$TimeStamp         = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath        = "$BackupRoot\gsg-mecm-backup-$TimeStamp"

$ErrorActionPreference = "Stop"

# ---- ADMIN CHECK ----
function Assert-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-Host "❌ Script must be run as Administrator." -ForegroundColor Red
        exit 1
    }
}

try {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "IT4U SAFE Production Deployment (ADMIN)" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan

    Assert-Admin
    Write-Host "[OK] Administrator privileges confirmed" -ForegroundColor Green

    # ---- PREFLIGHT ----
    if (-not (Test-Path $FrontendBuildPath)) {
        throw "Frontend build not found at $FrontendBuildPath"
    }
    if (-not (Test-Path $IisSitePath)) {
        throw "IIS site path not found at $IisSitePath"
    }

    Write-Host "[OK] Source build found: $FrontendBuildPath" -ForegroundColor Green
    Write-Host "[OK] Target directory: $IisSitePath" -ForegroundColor Green

    # ---- BACKUP ----
    Write-Host ""
    Write-Host "[2/5] BACKUP CURRENT STATE" -ForegroundColor Yellow
    Write-Host "Creating backup: $BackupPath" -ForegroundColor White

    robocopy $IisSitePath $BackupPath /MIR /R:2 /W:2 | Out-Null

    Write-Host "[OK] Backup created successfully!" -ForegroundColor Green

    # ---- STOP IIS ----
    Write-Host ""
    Write-Host "[3/5] STOP IIS" -ForegroundColor Yellow
    iisreset /stop | Out-Null
    Write-Host "[OK] IIS stopped" -ForegroundColor Green

    # ---- DEPLOY ----
    Write-Host ""
    Write-Host "[4/5] DEPLOY NEW FILES" -ForegroundColor Yellow

    Remove-Item "$IisSitePath\*" -Recurse -Force
    robocopy $FrontendBuildPath $IisSitePath /MIR /R:2 /W:2 | Out-Null

    Write-Host "[OK] Files copied successfully!" -ForegroundColor Green

    # ---- VERIFY ----
    Write-Host ""
    Write-Host "[5/5] VERIFY DEPLOYMENT" -ForegroundColor Yellow

    if (-not (Test-Path "$IisSitePath\index.html")) {
        throw "index.html missing after deployment"
    }

    Write-Host "[OK] index.html present" -ForegroundColor Green

    # ---- START IIS ----
    Write-Host ""
    Write-Host "Restarting IIS..." -ForegroundColor Yellow
    iisreset /start | Out-Null
    Write-Host "[OK] IIS restarted!" -ForegroundColor Green

    # ---- SUMMARY ----
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Source : $FrontendBuildPath" -ForegroundColor White
    Write-Host "Target : $IisSitePath" -ForegroundColor White
    Write-Host "Backup : $BackupPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Clear browser cache (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "2. Open https://gsg-mecm/login" -ForegroundColor White
    Write-Host "3. Verify footer text updated" -ForegroundColor White
}
catch {
    Write-Host ""
    Write-Host "❌ DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "ROLLBACK COMMAND:" -ForegroundColor Yellow
    Write-Host "robocopy `"$BackupPath`" `"$IisSitePath`" /MIR && iisreset" -ForegroundColor White
    exit 1
}
