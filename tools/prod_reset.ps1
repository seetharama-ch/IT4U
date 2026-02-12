$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping node/java processes (safe kill)..." -ForegroundColor Yellow
Get-Process node, java -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Freeing ports if used (4173/5173/8060/8080)..." -ForegroundColor Yellow
$ports = @(4173,5173,8060,8080)
foreach ($p in $ports) {
  $con = netstat -ano | Select-String ":$p " | ForEach-Object { ($_ -split "\s+")[-1] } | Select-Object -Unique
  foreach ($pid in $con) { Stop-Process -Id $pid -Force }
}

Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c", "cd backend && run_backend.bat" -RedirectStandardOutput "backend_debug.log" -RedirectStandardError "backend_err.log"

Start-Sleep -Seconds 5

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c", "cd frontend && npm run dev"

Write-Host "Reset done. Open PROD URL in Incognito and test." -ForegroundColor Green
