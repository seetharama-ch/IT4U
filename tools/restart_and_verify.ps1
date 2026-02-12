$ErrorActionPreference = "Stop"

Write-Host "1. Killing existing processes..." -ForegroundColor Yellow
Get-Process node, java -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "2. Starting Backend..." -ForegroundColor Yellow
$backendDir = ".\backend"
# Use Start-Process to run in background but redirect output to file for debugging
$pInfo = New-Object System.Diagnostics.ProcessStartInfo
$pInfo.FileName = "cmd.exe"
$pInfo.Arguments = "/c cd backend && run_backend.bat > ..\backend_run.log 2>&1"
$pInfo.WindowStyle = "Hidden" 
$p = [System.Diagnostics.Process]::Start($pInfo)

Write-Host "   Backend started (PID: $($p.Id)). Waiting for port 8060..." -ForegroundColor Cyan

# Wait loop
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$started = $false
while ($sw.Elapsed.TotalSeconds -lt 60) {
    if (Test-NetConnection -ComputerName localhost -Port 8060 -InformationLevel Quiet) {
        $started = $true
        break
    }
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline
}
Write-Host ""

if (-not $started) {
    Write-Host "FATAL: Backend did not start on port 8060 within 60 seconds." -ForegroundColor Red
    Get-Content ".\backend_run.log" -Tail 20
    exit 1
}

Write-Host "3. Backend is UP! Starting Frontend..." -ForegroundColor Yellow
$pInfoFe = New-Object System.Diagnostics.ProcessStartInfo
$pInfoFe.FileName = "cmd.exe"
$pInfoFe.Arguments = "/c cd frontend && npm run dev > ..\frontend_run.log 2>&1"
$pInfoFe.WindowStyle = "Hidden"
[System.Diagnostics.Process]::Start($pInfoFe) | Out-Null

Write-Host "4. Verifying Admin Login..." -ForegroundColor Yellow
$pkg = @{ "Content-Type" = "application/json" }
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $pkg -Body $body
    Write-Host "✅ Login SUCCESS! Token received." -ForegroundColor Green
} catch {
    Write-Host "❌ Login FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
    exit 1
}
