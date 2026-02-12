#requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

# ==============================
# IT4U PROD ONE-CLICK DEPLOY
# ==============================

# ==============================
# CONFIG
# ==============================
$ProjectRoot = "D:\Workspace\gsg-IT4U"

$FrontendDir = Join-Path $ProjectRoot "frontend"
$BackendDir  = Join-Path $ProjectRoot "backend"

$IISWebRoot  = "C:\inetpub\wwwroot\gsg-mecm"
$WebConfigTemplate = Join-Path $ProjectRoot "web.config.template"

$BackendPort   = 8060
$SpringProfile = "prod"

$BaseUrl = "https://gsg-mecm"
$HealthUrlLocal = "http://127.0.0.1:$BackendPort/actuator/health"
$HealthUrlProxy = "$BaseUrl/actuator/health"

$IISAppPoolName = "IT4U-Prod"

$PidFile   = Join-Path $ProjectRoot ".it4u-backend.pid"
$LogDir    = Join-Path $ProjectRoot "logs"
$StdOutLog = Join-Path $LogDir "backend-stdout.log"
$StdErrLog = Join-Path $LogDir "backend-stderr.log"

$MaxRetries = 5
$RetryDelay = 8

# ==============================
# HELPERS
# ==============================
function Step([string]$m){ Write-Host ("`n=== {0} ===" -f $m) -ForegroundColor Cyan }
function OK([string]$m){ Write-Host ("[OK] {0}" -f $m) -ForegroundColor Green }
function WARN([string]$m){ Write-Host ("[WARN] {0}" -f $m) -ForegroundColor Yellow }
function FAIL([string]$m){ Write-Host ("[FAIL] {0}" -f $m) -ForegroundColor Red }

function Ensure-Dirs {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  if (!(Test-Path $FrontendDir)) { throw "Missing frontend dir: $FrontendDir" }
  if (!(Test-Path $BackendDir))  { throw "Missing backend dir:  $BackendDir" }
  if (!(Test-Path $IISWebRoot))  { throw "Missing IIS web root: $IISWebRoot" }
}

function Curl-Strict {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [switch]$Insecure,
    [switch]$Silent
  )

  $args = @()
  if ($Insecure) { $args += "-k" }
  if ($Silent)   { $args += "-s" }
  $args += $Url

  $out = & curl.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw ("curl failed ({0}): curl.exe {1}" -f $LASTEXITCODE, ($args -join " "))
  }
  return $out
}

function Get-LatestBackendJar {
  $jar = Get-ChildItem (Join-Path $BackendDir "target\it4u-*.jar") -ErrorAction SilentlyContinue |
         Sort-Object LastWriteTime -Descending |
         Select-Object -First 1
  if (-not $jar) { throw "No it4u-*.jar found under $BackendDir\target" }
  return $jar.FullName
}

function Stop-Backend {
  Step "Stopping existing backend (if any)"

  if (Test-Path $PidFile) {
    $backendPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($backendPid -and ($backendPid -match '^\d+$')) {
      Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }

  Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
    Where-Object { $_.CommandLine -and ($_.CommandLine -match "it4u-.*\.jar") } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

  OK "Backend stop step done"
}

function Kill-Node {
  Step "Killing node.exe (avoid EPERM locks)"
  Get-Process node -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
  OK "Node cleanup done"
}

function Restart-IIS {
  Step "Restarting IIS (app pool recycle preferred)"
  Import-Module WebAdministration

  if ($IISAppPoolName) {
    Restart-WebAppPool -Name $IISAppPoolName
  } else {
    iisreset /noforce | Out-Null
  }

  Start-Sleep 3
  OK "IIS restart done"
}

function Build-Frontend {
  Step "Frontend build"
  Set-Location $FrontendDir

  $null = & npm install
  $null = & npx vite build

  $dist = Join-Path $FrontendDir "dist"
  if (!(Test-Path $dist)) { throw "Frontend build failed: dist not created" }

  OK "Frontend build OK"
  return $dist
}

function Deploy-IIS([string]$dist) {
  Step "Deploying frontend to IIS"
  Copy-Item "$dist\*" $IISWebRoot -Recurse -Force

  if (Test-Path $WebConfigTemplate) {
    Copy-Item $WebConfigTemplate (Join-Path $IISWebRoot "web.config") -Force
    OK "web.config deployed"
  } else {
    WARN "web.config.template not found; keeping existing web.config"
  }

  $indexPath = Join-Path $IISWebRoot "index.html"
  if (Test-Path $indexPath) { (Get-Item $indexPath).LastWriteTime = Get-Date }

  OK "IIS deploy OK"
}

function Wait-BackendUp {
  param([int]$tries = 40, [int]$sleepSec = 2)

  for ($i=1; $i -le $tries; $i++) {
    try {
      $resp = Curl-Strict -Url $HealthUrlLocal -Silent
      if ($resp -match '"status"\s*:\s*"UP"') { return $true }
    } catch {}
    Start-Sleep -Seconds $sleepSec
  }
  return $false
}

function Start-Backend {
  Step "Starting backend (Spring Boot)"
  $jarPath = Get-LatestBackendJar
  OK ("Using JAR: {0}" -f $jarPath)

  Remove-Item $StdOutLog,$StdErrLog -Force -ErrorAction SilentlyContinue

  $argLine = "-jar `"$jarPath`" --spring.profiles.active=$SpringProfile --server.port=$BackendPort"

  $proc = Start-Process -FilePath "java" -ArgumentList $argLine -PassThru `
    -RedirectStandardOutput $StdOutLog `
    -RedirectStandardError  $StdErrLog `
    -WindowStyle Hidden

  $backendPid = $proc.Id
  Set-Content -Path $PidFile -Value $backendPid

  if (-not (Wait-BackendUp -tries 50 -sleepSec 2)) {
    FAIL "Backend did not become UP. Last stderr:"
    if (Test-Path $StdErrLog) { Get-Content $StdErrLog -Tail 200 }
    throw "Backend did not become UP on $HealthUrlLocal"
  }

  OK "Backend UP"
}

function Verify {
  Step "Verification"

  $h1 = Curl-Strict -Url $HealthUrlLocal -Silent
  if ($h1 -notmatch '"status"\s*:\s*"UP"') { throw "Local health not UP: $h1" }

  $h2 = Curl-Strict -Url $HealthUrlProxy -Insecure -Silent
  if ($h2 -notmatch '"status"\s*:\s*"UP"') { throw "Proxy health not UP: $h2" }

  # IMPORTANT: do NOT use $home (collides with $HOME). Use $homeHtml
  $homeHtml = Curl-Strict -Url "$BaseUrl/" -Insecure -Silent
  if ($homeHtml -notmatch '<div id="root"></div>') {
    throw "Homepage not React index.html (possible IIS/web.config regression)"
  }

  OK "Health + homepage OK"
}

# ==============================
# MAIN RETRY LOOP
# ==============================
Ensure-Dirs
$success = $false

for ($i=1; $i -le $MaxRetries; $i++) {
  try {
    Write-Host ("`n######## ATTEMPT {0} / {1} ########" -f $i, $MaxRetries) -ForegroundColor Magenta

    Stop-Backend
    Kill-Node

    $dist = Build-Frontend
    Deploy-IIS -dist $dist

    Restart-IIS
    Start-Backend
    Verify

    $success = $true
    break
  }
  catch {
    FAIL $_.Exception.Message
    try { Restart-IIS } catch { WARN ("IIS restart failed: {0}" -f $_.Exception.Message) }
    if ($i -lt $MaxRetries) {
      WARN ("Retrying in {0}s..." -f $RetryDelay)
      Start-Sleep $RetryDelay
    }
  }
}

if ($success) {
  Write-Host ("`nDEPLOY PASSED ✅  Open: {0}/login" -f $BaseUrl) -ForegroundColor Green
  exit 0
} else {
  Write-Host "`nDEPLOY FAILED ❌" -ForegroundColor Red
  Write-Host "Check logs:"
  Write-Host $StdOutLog
  Write-Host $StdErrLog
  exit 1
}
