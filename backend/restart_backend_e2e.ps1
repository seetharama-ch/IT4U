$ErrorActionPreference = "Stop"

Write-Host ">>> Stopping existing Backend on port 8060..."
$port = 8060
# Get PIDs listening on 8060, ignoring PID 0
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty OwningProcess -Unique | 
            Where-Object { $_ -gt 0 }

if ($processes) {
    foreach ($pid_id in $processes) {
        Write-Host "Stopping PID $pid_id..."
        Stop-Process -Id $pid_id -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "No process found on port $port. Checking for java..."
    # Fallback: Kill any java running it4u jar? 
    # Just assume port free if logic above didn't find blocking PID (or it was 0 which is phantom)
}

Write-Host ">>> Starting Backend with E2E Profile (Notifications Disabled)..."
# Use -Dnotifications.enabled=false directly to ensure it overrides everything
# Also -Dspring.profiles.active=e2e to load application-e2e.yml
Start-Process "java" -ArgumentList "-Dnotifications.enabled=false", "-Dspring.profiles.active=e2e", "-jar", "target\it4u-1.4.1.jar" -RedirectStandardOutput "backend_8060_e2e.log" -RedirectStandardError "backend_8060_e2e.err" -WorkingDirectory "d:\Workspace\gsg-IT4U\backend"

Write-Host ">>> Waiting for Backend to start..."
$retries = 30
while ($retries -gt 0) {
    if (Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet) {
        Write-Host "Backend is UP on port $port!" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 2
    $retries--
    Write-Host "." -NoNewline
}
Write-Error "Backend failed to start within 60 seconds."
