$ErrorActionPreference = "Stop"
$pkg = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json

try {
    Write-Host "Attempting login with 'admin123'..."
    $resp = Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $pkg -Body $body -WebSession $session
    Write-Host "Login SUCCESS!" -ForegroundColor Green
    Write-Host "Token: $($resp.token)" 
} catch {
    Write-Host "Login FAILED!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
