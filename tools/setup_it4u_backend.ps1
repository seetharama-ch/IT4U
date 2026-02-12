# Check for Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "You must run this script as Administrator!"
    exit
}

$ErrorActionPreference = "Stop"

Write-Host ">>> Stopping IT4U-Backend Service..." -ForegroundColor Cyan
C:\Tools\nssm\nssm.exe stop IT4U-Backend
if ($LASTEXITCODE -ne 0) { Write-Warning "Service might not be running or failed to stop." }

Write-Host ">>> Configuring NSSM Service..." -ForegroundColor Cyan

# 3.1 Set Java executable
Write-Host "Setting Application Path..."
C:\Tools\nssm\nssm.exe set IT4U-Backend Application "C:\Program Files\Java\jdk-17\bin\java.exe"

# 3.2 Set working directory
Write-Host "Setting AppDirectory..."
C:\Tools\nssm\nssm.exe set IT4U-Backend AppDirectory "D:\Apps\IT4U\backend"

# 3.3 Set JAR parameters
Write-Host "Setting AppParameters..."
C:\Tools\nssm\nssm.exe set IT4U-Backend AppParameters "-jar D:\Apps\IT4U\backend\it4u-1.4.1.jar"

# 4. Configure logs
Write-Host "Configuring Logs..."
New-Item -ItemType Directory -Force -Path "D:\Apps\IT4U\logs" | Out-Null
C:\Tools\nssm\nssm.exe set IT4U-Backend AppStdout "D:\Apps\IT4U\logs\it4u-backend-stdout.log"
C:\Tools\nssm\nssm.exe set IT4U-Backend AppStderr "D:\Apps\IT4U\logs\it4u-backend-stderr.log"
C:\Tools\nssm\nssm.exe set IT4U-Backend AppRotateFiles 1
C:\Tools\nssm\nssm.exe set IT4U-Backend AppRotateOnline 1
C:\Tools\nssm\nssm.exe set IT4U-Backend AppRotateSeconds 86400
C:\Tools\nssm\nssm.exe set IT4U-Backend AppRotateBytes 10485760

Write-Host ">>> Configuring Service Resilience..." -ForegroundColor Cyan
# 5. Resilience
Write-Host "Setting AppExit Restart..."
C:\Tools\nssm\nssm.exe set IT4U-Backend AppExit Default Restart

Write-Host "Setting Restart Delay & Throttle..."
C:\Tools\nssm\nssm.exe set IT4U-Backend AppRestartDelay 10000
C:\Tools\nssm\nssm.exe set IT4U-Backend AppThrottle 1500

Write-Host "Setting Windows Service Recovery..."
sc.exe failure IT4U-Backend reset= 86400 actions= restart/60000/restart/60000/restart/60000

Write-Host ">>> Starting IT4U-Backend Service..." -ForegroundColor Cyan
C:\Tools\nssm\nssm.exe start IT4U-Backend

# 6. Verification
Write-Host ">>> Verifying Deployment..." -ForegroundColor Cyan

# 6.1 Confirm port 8060 is listening
Write-Host "Checking Port 8060..."
$retry = 0
$maxRetries = 10
while ($retry -lt $maxRetries) {
    $portActive = Get-NetTCPConnection -LocalPort 8060 -ErrorAction SilentlyContinue
    if ($portActive) {
        Write-Host "✅ Port 8060 is LISTENING" -ForegroundColor Green
        break
    }
    Write-Host "Waiting for port 8060... ($retry/$maxRetries)"
    Start-Sleep -Seconds 3
    $retry++
}

if (-not $portActive) {
    Write-Error "❌ Service failed to start on port 8060."
}

# 6.2 Health check
Write-Host "Checking Health Endpoint..."
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8060/actuator/health" -UseBasicParsing
    if ($health.StatusCode -eq 200 -or $health.StatusCode -eq 401) {
         Write-Host "✅ Backend Health: $($health.StatusCode)" -ForegroundColor Green
    } else {
         Write-Warning "⚠️ Backend Health returned unexpected status: $($health.StatusCode)"
    }
} catch {
    Write-Warning "⚠️ Failed to reach health endpoint: $_"
}

# 6.3 IIS reverse proxy validation
Write-Host "Checking IIS Proxy..."
try {
    $proxy = Invoke-WebRequest -Uri "https://gsg-mecm/api/health" -SkipCertificateCheck -UseBasicParsing
    Write-Host "✅ IIS Proxy Response: $($proxy.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ IIS Proxy Response: 401 Unauthorized (Expected)" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ IIS Proxy check failed: $_"
    }
}

Write-Host ">>> DONE. Setup Complete." -ForegroundColor Cyan
