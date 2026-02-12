$ErrorActionPreference = "Stop"

# 1. Stop Backend
Write-Host ">>> Stopping Backend (8060)..." -ForegroundColor Yellow
$port = 8060
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $pid_val = $conn.OwningProcess
        Write-Host "Killing PID: $pid_val"
        Stop-Process -Id $pid_val -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# 2. Build Backend
Write-Host ">>> Building Backend..." -ForegroundColor Cyan
if (Test-Path "mvnw.cmd") {
    ./mvnw.cmd clean package -DskipTests
} else {
    mvn clean package -DskipTests
}

# 3. Start Backend
Write-Host ">>> Starting Backend (run-prod.ps1)..." -ForegroundColor Green
# Using run-prod.ps1 but verifying if it starts in background or foreground.
# Usually we want background.
# start-process powershell -argumentlist "-File run-prod.ps1"
# But I prefer to just launch correct java command or existing script if robust.
# Let's use run-prod.ps1 but assume it blocks? No, usually start-process java.
Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File run-prod.ps1" -WindowStyle Hidden

# 4. Wait for Port
Write-Host ">>> Waiting for Backend to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i=0; $i -lt 60; $i++) {
    if (Get-NetTCPConnection -LocalPort 8060 -ErrorAction SilentlyContinue) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline
}

if ($ready) {
    Write-Host "`n>>> Backend is UP!" -ForegroundColor Green
} else {
    Write-Error "`n>>> Backend failed to start or is slow."
}
