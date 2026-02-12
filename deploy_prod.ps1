# ============================================
# IT4U Production Build & Deploy Script
# Usage: ./deploy_prod.ps1
# Run from repo root (where frontend/ and backend/ exist)
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ">>> Starting IT4U Production Deployment..." -ForegroundColor Cyan

# ----------------------
# 0. Resolve paths
# ----------------------
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }   # fallback if needed

$frontendDir = Join-Path $root "frontend"
$backendDir  = Join-Path $root "backend"
$staticDir   = Join-Path $backendDir "src\main\resources\static"
$dbUpdateSql = Join-Path $root "db_update.sql"

# Basic folder checks
foreach ($p in @($frontendDir, $backendDir)) {
    if (-not (Test-Path $p)) {
        Write-Error "Required folder not found: $p"
        exit 1
    }
}

# ----------------------
# 1. Environment Check
# ----------------------
if (-not (Get-Command "npm"  -ErrorAction SilentlyContinue)) { Write-Error "NPM not found!";  exit 1 }
if (-not (Get-Command "java" -ErrorAction SilentlyContinue)) { Write-Error "Java not found!"; exit 1 }

# Maven: allow mvnw.cmd OR mvn
$mvnCmd = $null
$mvnw = Join-Path $backendDir "mvnw.cmd"
if (Test-Path $mvnw) {
    $mvnCmd = $mvnw
    Write-Host ">>> Using Maven Wrapper: $mvnCmd" -ForegroundColor Green
}
elseif (Get-Command "mvn" -ErrorAction SilentlyContinue) {
    $mvnCmd = "mvn"
    Write-Host ">>> Using System Maven" -ForegroundColor Green
}
else {
    Write-Error "Maven not found (no mvnw.cmd and no mvn in PATH)."
    exit 1
}

# ----------------------
# 2. Build Frontend
# ----------------------
Write-Host "`n>>> Building Frontend..." -ForegroundColor Cyan
Push-Location $frontendDir
try {
    # For production build (relative API paths)
    $env:VITE_API_URL = ""

    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
}
finally {
    $env:VITE_API_URL = $null
    Pop-Location
}

# ----------------------
# 3. Copy Assets
# ----------------------
Write-Host "`n>>> Copying Static Assets to Backend..." -ForegroundColor Cyan

if (-not (Test-Path $staticDir)) {
    New-Item -ItemType Directory -Force -Path $staticDir | Out-Null
}

# Clean ONLY previous frontend build outputs (safe approach)
# Remove common Vite outputs: assets/ + index.html + favicon if present
$assetsPath = Join-Path $staticDir "assets"
if (Test-Path $assetsPath) { Remove-Item -Recurse -Force $assetsPath }

$indexHtml = Join-Path $staticDir "index.html"
if (Test-Path $indexHtml) { Remove-Item -Force $indexHtml }

# Copy fresh dist
Copy-Item -Recurse -Force (Join-Path $frontendDir "dist\*") $staticDir

# ----------------------
# 4. Build Backend
# ----------------------
Write-Host "`n>>> Building Backend JAR..." -ForegroundColor Cyan
Push-Location $backendDir
try {
    if ($mvnCmd -eq "mvn") {
        mvn clean package -DskipTests
    } else {
        & $mvnCmd clean package -DskipTests
    }

    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
}
finally {
    Pop-Location
}

# ----------------------
# 5. Detect latest JAR
# ----------------------
$targetDir = Join-Path $backendDir "target"
$latestJar = Get-ChildItem $targetDir -Filter "it4u-*.jar" |
    Where-Object { $_.Name -notlike "*.original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latestJar) {
    Write-Error "No built JAR found in: $targetDir"
    exit 1
}

# ----------------------
# 6. Optional DB migration (if psql exists + db_update.sql exists)
# ----------------------
Write-Host "`n>>> Database Migration Check..." -ForegroundColor Cyan

if (Test-Path $dbUpdateSql) {
    $psql = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($psql) {
        Write-Host "psql found. Attempting to run db_update.sql..." -ForegroundColor Yellow

        $prodPropsPath = Join-Path $backendDir "src\main\resources\application-prod.properties"
        if (Test-Path $prodPropsPath) {
            $prodProps = Get-Content $prodPropsPath

            $dbUrl  = ($prodProps | Select-String "^spring\.datasource\.url\s*=\s*(.*)$").Matches.Groups[1].Value.Trim()
            $dbUser = ($prodProps | Select-String "^spring\.datasource\.username\s*=\s*(.*)$").Matches.Groups[1].Value.Trim()
            $dbPass = ($prodProps | Select-String "^spring\.datasource\.password\s*=\s*(.*)$").Matches.Groups[1].Value.Trim()

            if ($dbUrl -match "jdbc:postgresql://([^:\/]+):(\d+)\/(.+)") {
                $dbHost = $matches[1]
                $dbPort = $matches[2]
                $dbName = $matches[3]

                # Use PGPASSWORD for non-interactive
                $env:PGPASSWORD = $dbPass
                try {
                    & $psql.Source -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $dbUpdateSql
                    Write-Host "Database migration completed." -ForegroundColor Green
                }
                catch {
                    Write-Warning "Database migration failed. Run manually if needed:"
                    Write-Host "psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$dbUpdateSql`"" -ForegroundColor Gray
                    Write-Warning $_
                }
                finally {
                    $env:PGPASSWORD = $null
                }
            }
            else {
                Write-Warning "Could not parse spring.datasource.url from application-prod.properties"
            }
        }
        else {
            Write-Warning "application-prod.properties not found at: $prodPropsPath"
        }
    }
    else {
        Write-Warning "psql not found in PATH. Skipping DB migration."
        Write-Host "Manual run example:" -ForegroundColor Gray
        Write-Host "  & `"C:\Program Files\PostgreSQL\14\bin\psql.exe`" -h localhost -p 5432 -U it4u_user -d it4u -f `"$dbUpdateSql`"" -ForegroundColor Gray
    }
}
else {
    Write-Host "db_update.sql not found. Skipping DB migration." -ForegroundColor Gray
}

# ----------------------
# 7. Run Instructions
# ----------------------
Write-Host "`n>>> Build Complete!" -ForegroundColor Green
Write-Host "Latest JAR detected:" -ForegroundColor Yellow
Write-Host "  $($latestJar.FullName)" -ForegroundColor White

Write-Host "`nEnsure these environment variables are set (if your prod config uses them):" -ForegroundColor Yellow
Write-Host "  MAIL_PASSWORD"
Write-Host "  AZURE_CLIENT_ID"
Write-Host "  AZURE_CLIENT_SECRET"
Write-Host "  AZURE_TENANT_ID"
Write-Host "  DB_PASSWORD   (only if you moved DB password to env vars)"

Write-Host "`nThen run:" -ForegroundColor Cyan
Write-Host "  java -jar `"$($latestJar.FullName)`" --spring.profiles.active=prod" -ForegroundColor White
