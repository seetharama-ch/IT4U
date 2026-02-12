$ErrorActionPreference = "Stop"
$jarPath = "d:\Workspace\gsg-IT4U\backend\target\it4u-1.4.1.jar"
$logFile = "d:\Workspace\gsg-IT4U\backend_run.log"

Write-Host "Starting $jarPath..."
Write-Host "Logs: $logFile"

# Kill existing on 8060 if any (simple check)
$portProcess = Get-NetTCPConnection -LocalPort 8060 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($portProcess) {
    Write-Host "Killing process $portProcess on port 8060..."
    Stop-Process -Id $portProcess -Force
}

# Start Java
$proc = Start-Process -FilePath "java" -ArgumentList "-jar", """$jarPath""", "--spring.profiles.active=prod", "--server.port=8060" -RedirectStandardOutput $logFile -RedirectStandardError "d:\Workspace\gsg-IT4U\backend_err.log" -PassThru -WindowStyle Hidden

Write-Host "Started Process ID: $($proc.Id)"
Write-Host "Waiting for startup..."
Start-Sleep -Seconds 20

# Check health
try {
    $resp = Invoke-WebRequest "http://localhost:8060/actuator/health" -UseBasicParsing
    Write-Host "Health Check: $($resp.Content)"
} catch {
    Write-Warning "Health check failed (might still be starting). Check $logFile"
}
