# ============================================
# Deploy Attachment Fix to PROD
# ============================================
# Run this script to deploy frontend and backend changes

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ATTACHMENT FIX DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================
# Step 1: Frontend Deployment
# ============================================
Write-Host "[1/4] Deploying Frontend..." -ForegroundColor Yellow

$frontendDist = "d:\Workspace\gsg-IT4U\frontend\dist"
$iisPath = "C:\inetpub\wwwroot\gsg-mecm"

if (Test-Path $frontendDist) {
    Write-Host "  -> Copying frontend build to IIS..." -ForegroundColor Gray
    Copy-Item -Path "$frontendDist\*" -Destination $iisPath -Recurse -Force
    Write-Host "  ✓ Frontend deployed to $iisPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend dist folder not found. Run 'npm run build' first!" -ForegroundColor Red
    exit 1
}

# ============================================
# Step 2: Backend Rebuild  
# ============================================
Write-Host "`n[2/4] Rebuilding Backend..." -ForegroundColor Yellow

Set-Location "d:\Workspace\gsg-IT4U\backend"

Write-Host "  -> Running Maven build..." -ForegroundColor Gray
mvn clean package -DskipTests

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Maven build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Backend built successfully" -ForegroundColor Green

# ============================================
# Step 3: Restart IIS
# ============================================
Write-Host "`n[3/4] Restarting IIS..." -ForegroundColor Yellow

try {
    iisreset
    Write-Host "  ✓ IIS restarted" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Failed to restart IIS (may need admin privileges)" -ForegroundColor Red
    Write-Host "  -> Run 'iisreset' manually as administrator" -ForegroundColor Yellow
}

# ============================================
# Step 4: Verify Storage Directory
# ============================================
Write-Host "`n[4/4] Verifying Storage Directory..." -ForegroundColor Yellow

$storagePath = "D:\IT4U\storage\attachments"

if (Test-Path $storagePath) {
    Write-Host "  ✓ Storage directory exists: $storagePath" -ForegroundColor Green
} else {
    Write-Host "  ! Storage directory not found, creating..." -ForegroundColor Yellow
    New-Item -Path $storagePath -ItemType Directory -Force | Out-Null
    Write-Host "  ✓ Created: $storagePath" -ForegroundColor Green
    Write-Host "  ! IMPORTANT: Set permissions for IIS App Pool!" -ForegroundColor Yellow
    Write-Host "    Run: icacls `"$storagePath`" /grant `"IIS APPPOOL\gsg-mecm:(OI)(CI)M`"" -ForegroundColor Cyan
}

# ============================================
# Deployment Complete
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart backend service (if running as service)" -ForegroundColor White
Write-Host "2. Run E2E test: cd frontend && npx playwright test attachments_flow_prod.spec.ts --config=playwright.prod.config.ts" -ForegroundColor White
Write-Host "3. View results: npx playwright show-report`n" -ForegroundColor White
