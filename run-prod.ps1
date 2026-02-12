$ErrorActionPreference = "Stop"

$root      = "D:\Workspace\gsg-IT4U"
$frontend  = Join-Path $root "frontend"
$backend   = Join-Path $root "backend"
$staticDir = Join-Path $backend "src\main\resources\static"
$logsDir   = Join-Path $backend "logs"

if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

Write-Host "==> FRONTEND: Building production bundle" -ForegroundColor Cyan
Set-Location $frontend

# Use npx to run vite build (bypasses PATH issues)
& npx --yes vite@7.2.4 build

if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE"
}

Write-Host "==> BACKEND: Copying frontend dist -> static" -ForegroundColor Cyan
Set-Location $root

# Ensure static directory exists
if (-not (Test-Path $staticDir)) { 
    New-Item -ItemType Directory -Path $staticDir -Force | Out-Null 
}

# Clean old static files
Remove-Item -Recurse -Force "$staticDir\*" -ErrorAction SilentlyContinue

# Copy new build
if (-not (Test-Path "$frontend\dist")) {
    throw "Frontend dist directory not found after build!"
}

Copy-Item -Recurse -Force "$frontend\dist\*" $staticDir

Write-Host "==> BACKEND: Building JAR with embedded frontend" -ForegroundColor Cyan
Set-Location $backend
& mvn clean package -DskipTests

if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed with exit code $LASTEXITCODE"
}

$jar = Get-ChildItem -Path "target" -Filter "it4u-*.jar" |
  Where-Object { $_.Name -notlike "*.original" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $jar) { throw "No it4u-*.jar found in target after build." }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile   = Join-Path $logsDir "it4u-prod-$timestamp.log"

Write-Host "==> RUNNING PRODUCTION JAR: $($jar.FullName)" -ForegroundColor Green
Write-Host "==> LOG FILE: $logFile" -ForegroundColor Yellow
Write-Host "==> FRONTEND ASSETS: Embedded in JAR at /static/" -ForegroundColor Cyan
Write-Host "==> MAIN URL: http://localhost:8060" -ForegroundColor Magenta

java -jar $jar.FullName --spring.profiles.active=prod --server.port=8060 2>&1 | Tee-Object -FilePath $logFile
