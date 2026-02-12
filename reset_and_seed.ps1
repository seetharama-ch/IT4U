# Reset Environment and Run E2E Tests
$ErrorActionPreference = "Stop"

# Base URL
$baseUrl = "http://localhost:8060/api"
# Admin credentials
$adminUser = "admin"
$adminPass = "admin123" 

# 1. Login to get Token/Session
Write-Host "Logging in as Admin..."
$loginBody = @{
    username = $adminUser
    password = $adminPass
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable "Session"
    Write-Host "Login Successful"
} catch {
    Write-Error "Login Failed: $_"
}

# 2. Reset Data (Full)
Write-Host "Resetting Database..."
try {
    $resetResponse = Invoke-WebRequest -Uri "$baseUrl/admin/reset/full" -Method Post -WebSession $Session
    Write-Host "Reset Complete"
} catch {
    Write-Error "Reset Failed: $_"
}

# 3. Seed Data
Write-Host "Seeding Test Users..."
try {
    $seedResponse = Invoke-WebRequest -Uri "$baseUrl/admin/reset/seed" -Method Post -WebSession $Session
    Write-Host "Seeding Complete"
} catch {
    Write-Error "Seeding Failed: $_"
}

Write-Host "Ready for E2E"
