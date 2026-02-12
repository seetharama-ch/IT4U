<# 
deploy_frontend_robocopy.ps1
- Builds frontend (optional switch)
- Takes timestamped backup
- Deploys dist to IIS webroot using robocopy
- Recycles only the IT4U app pool/site (no full iisreset unless you want)
Run PowerShell as Administrator
#>

param(
  [switch]$Build,                 # if passed, runs npm build before deploy
  [switch]$StopIIS,               # if passed, stops IIS (heavy)
  [switch]$StartIIS,              # if passed, starts IIS (heavy)
  [string]$RepoRoot = "D:\Workspace\gsg-IT4U",
  [string]$FrontendPath = "frontend",
  [string]$IisSitePath = "C:\inetpub\wwwroot\gsg-mecm",
  [string]$AppPoolName = "IT4U-Prod",
  [string]$SiteName = "IT4U-Prod"
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p  = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run PowerShell as Administrator."
  }
}

function Say($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }

Assert-Admin
Import-Module WebAdministration -ErrorAction SilentlyContinue

$frontendDir = Join-Path $RepoRoot $FrontendPath
$distDir     = Join-Path $frontendDir "dist"

Say "=== FRONTEND DEPLOY (ROBOCOPY) ==="
Say "RepoRoot  : $RepoRoot"
Say "Frontend  : $frontendDir"
Say "Dist      : $distDir"
Say "IIS Path  : $IisSitePath"
Say "AppPool   : $AppPoolName"
Say "SiteName  : $SiteName"

if (-not (Test-Path $RepoRoot))    { throw "RepoRoot not found: $RepoRoot" }
if (-not (Test-Path $frontendDir)) { throw "Frontend path not found: $frontendDir" }
if (-not (Test-Path $IisSitePath)) { throw "IIS site path not found: $IisSitePath" }

# 1) Build (optional)
if ($Build) {
  Say "1) Building frontend..."
  Push-Location $frontendDir
  if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Warn "node_modules missing -> npm ci"
    npm ci
  }
  npm run build
  Pop-Location
  Ok "Frontend build complete."
} else {
  Warn "Build step skipped (using existing dist). Pass -Build to rebuild."
}

if (-not (Test-Path $distDir)) { throw "dist folder not found: $distDir (run with -Build)" }

# 2) Optional stop IIS (heavy; generally not needed)
if ($StopIIS) {
  Say "2) Stopping IIS (iisreset /stop)..."
  iisreset /stop | Out-Host
  Ok "IIS stopped."
}

# 3) Backup current site
Say "3) Creating backup..."
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "C:\inetpub\wwwroot\gsg-mecm_backup_$ts"
Copy-Item $IisSitePath $backup -Recurse -Force
Ok "Backup created: $backup"

# 4) Deploy via robocopy
Say "4) Deploying dist -> IIS with robocopy /MIR..."
$log = Join-Path $env:TEMP "it4u_frontend_robocopy_$ts.log"
$rc = robocopy $distDir $IisSitePath /MIR /R:2 /W:2 /NP /NFL /NDL /LOG:$log
# robocopy exit codes 0-7 are "OK" (7 = extra files + mismatch fixed)
$code = $LASTEXITCODE
Say "Robocopy exit code: $code (0-7 is OK). Log: $log"
if ($code -gt 7) { throw "Robocopy failed with exit code $code. Check log: $log" }
Ok "Frontend files deployed."

# 5) Recycle only IT4U app pool/site (preferred)
Say "5) Recycling IIS app pool & site..."
try {
  Restart-WebAppPool -Name $AppPoolName -ErrorAction Stop
  Ok "AppPool recycled: $AppPoolName"
} catch {
  Warn "AppPool recycle failed: $($_.Exception.Message)"
}

try {
  Restart-WebItem "IIS:\Sites\$SiteName" -ErrorAction Stop
  Ok "Site restarted: $SiteName"
} catch {
  Warn "Site restart failed: $($_.Exception.Message)"
}

# 6) Optional start IIS (if you stopped it)
if ($StartIIS) {
  Say "6) Starting IIS (iisreset /start)..."
  iisreset /start | Out-Host
  Ok "IIS started."
}

Say "=== DONE ==="
Say "Verify: http://gsg-mecm/login (or https://gsg-mecm/login from client)"
