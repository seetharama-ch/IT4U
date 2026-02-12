param (
    [string]$To = "it4u-notify@geosoftglobal.com"
)

$baseUrl = "http://localhost:8080"
$adminUser = "admin"
$adminPass = "password"
$testRecipient = $To

Write-Host "1. Logging in as Admin..." -ForegroundColor Cyan
$loginUrl = "$baseUrl/api/auth/login"
$body = @{
    username = $adminUser
    password = $adminPass
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -ContentType "application/json" -SessionVariable "session"
    Write-Host "Login Successful!" -ForegroundColor Green
}
catch {
    Write-Host "Login Failed: $_" -ForegroundColor Red
    exit
}

Write-Host "2. Sending Test Email to $testRecipient..." -ForegroundColor Cyan
$emailUrl = "$baseUrl/api/admin/test-email?to=$testRecipient"

try {
    $response = Invoke-RestMethod -Uri $emailUrl -Method Get -WebSession $session
    Write-Host "Success: $response" -ForegroundColor Green
}
catch {
    Write-Host "Email Sending Failed: $_" -ForegroundColor Red
    # Initial diagnostics
    Write-Host "Check backend logs for SMTP errors." -ForegroundColor Yellow
}
