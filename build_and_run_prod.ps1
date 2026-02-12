$ErrorActionPreference = "Stop"

$frontendDir = "D:\Workspace\gsg-IT4U\frontend"
$backendDir = "D:\Workspace\gsg-IT4U\backend"
$staticDir = Join-Path $backendDir "src\main\resources\static"

# 1. Build Frontend
Write-Host "==> Building Frontend..." -ForegroundColor Cyan
Set-Location $frontendDir
npm install
npm run build
if (-not (Test-Path "dist")) { throw "Frontend build failed: dist folder not found" }

# 2. Copy to Backend
Write-Host "==> Copying Frontend to Backend Static Resources..." -ForegroundColor Cyan
if (Test-Path $staticDir) {
    Remove-Item $staticDir -Recurse -Force
}
New-Item -ItemType Directory -Path $staticDir | Out-Null
Copy-Item -Path "dist\*" -Destination $staticDir -Recurse

# 3. Run Backend Prod Script
Write-Host "==> Running Backend Prod Script..." -ForegroundColor Cyan
Set-Location $backendDir
./run-prod.ps1
