$ErrorActionPreference = "Stop"

$backendDir = "D:\Workspace\gsg-IT4U\backend"
$targetDir  = Join-Path $backendDir "target"
$configDir  = Join-Path $backendDir "config"
$logsDir    = Join-Path $backendDir "logs"

$profile = "prod"
$port    = 8060

# Create logs folder
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

Write-Host "==> Go to backend dir: $backendDir" -ForegroundColor Cyan
Set-Location $backendDir

# 0) Build Frontend
$frontendDir = Join-Path $backendDir "..\frontend"
if ($false) {
    Write-Host "==> Building Frontend in $frontendDir..." -ForegroundColor Cyan
    Push-Location $frontendDir
    # Install dependencies if needed (rudimentary check, or just run install)
    if (-not (Test-Path "node_modules")) {
        Write-Host "==> Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) { throw "Frontend npm install failed." }
    }
    
    Write-Host "==> Compiling frontend (npm run build)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
    
    $distDir = Join-Path $frontendDir "dist"
    $staticDir = Join-Path $backendDir "src\main\resources\static"
    
    # Create static dir if not exists (Maven also does this but we need it before package)
    if (-not (Test-Path $staticDir)) { New-Item -ItemType Directory -Path $staticDir | Out-Null }
    
    Write-Host "==> Copying frontend dist to backend static..." -ForegroundColor Yellow
    # Clean old static files (optional, but good for clean build)
    # Get-ChildItem $staticDir -Recurse | Remove-Item -Recurse -Force
    
    Copy-Item -Path "$distDir\*" -Destination $staticDir -Recurse -Force
    Pop-Location
} else {
    Write-Warning "Frontend directory not found at $frontendDir"
}

# 1) Stop previous running java (optional - safest for local prod runs)
# Uncomment if you want auto-stop old process:
# Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# 2) Clean old jars
Write-Host "==> Cleaning old JARs in target..." -ForegroundColor Yellow
# if (Test-Path $targetDir) {
#   Get-ChildItem $targetDir -Filter "it4u-*.jar" -ErrorAction SilentlyContinue | Remove-Item -Force
# }

# 3) Build new jar
Write-Host "==> Building fresh PROD jar (mvn package)..." -ForegroundColor Yellow
./mvnw.cmd clean package -DskipTests
if ($LASTEXITCODE -ne 0) { throw "Maven build failed. Fix errors and re-run." }

# 4) Pick newly built jar
$latestJar = Get-ChildItem $targetDir -Filter "it4u-*.jar" |
  Where-Object { $_.Name -notlike "*.original" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestJar) { throw "No it4u-*.jar found after build in $targetDir" }

Write-Host "==> Running JAR: $($latestJar.FullName)" -ForegroundColor Green

# 5) Run with prod config (external config folder recommended)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile   = Join-Path $logsDir "it4u-prod-$timestamp.log"

Write-Host "==> Logs: $logFile" -ForegroundColor Cyan

$args = @(
  "-jar", $latestJar.FullName,
  "--spring.profiles.active=$profile",
  "--server.port=$port"
)

# Use external prod config if present
if (Test-Path $configDir) {
  $args += "--spring.config.location=file:$configDir\"
}

java @args 2>&1 | Tee-Object -FilePath $logFile
