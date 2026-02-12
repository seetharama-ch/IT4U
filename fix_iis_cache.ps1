# Quick Fix: Clear IIS Output Cache
# Run as Administrator

Write-Host "=== IIS Cache Clear + Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Must run as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Stopping IIS..." -ForegroundColor Yellow
net stop was /y | Out-Host
Start-Sleep -Seconds 3
Write-Host "✓ IIS stopped" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Touching index.html to invalidate cache..." -ForegroundColor Yellow
$file = "C:\inetpub\wwwroot\gsg-mecm\index.html"
(Get-Item $file).LastWriteTime = Get-Date
Write-Host "✓ Timestampupdated: $(Get-Date)" -ForegroundColor Green
Write-Host ""

Write-Host "[3/4] Starting IIS..." -ForegroundColor Yellow
net start w3svc | Out-Host
Start-Sleep -Seconds 5
Write-Host "✓ IIS started" -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$response = curl.exe -k https://gsg-mecm/ 2>$null | Out-String

if ($response -match "IT4U_BUILD_MARKER") {
    Write-Host "✓ BUILD MARKER FOUND!" -ForegroundColor Green
    $marker = ($response | Select-String "IT4U_BUILD_MARKER").Line.Trim()
    Write-Host "  $marker" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Build marker NOT found" -ForegroundColor Yellow
}

if ($response -match "index-DBZBPIO5") {
    Write-Host "✓ NEW ASSETS SERVED (index-DBZBPIO5.js)" -ForegroundColor Green
} else {
    Write-Host "⚠ Still serving old assets" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Open https://gsg-mecm/login in browser" -ForegroundColor Yellow
Write-Host "Expected footer: 'Crafted by Seetharam'" -ForegroundColor Yellow
