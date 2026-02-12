$BaseUrl = "http://localhost:8060/api"
$AdminUser = "admin"
$AdminPass = "Admin@123"

Write-Host "Waiting for Backend to specific port..."
$retries = 30
while ($retries -gt 0) {
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:8060/actuator/health" -Method Get -ErrorAction Stop
        if ($test.StatusCode -eq 200) { break }
    } catch {
        $retries--
        Start-Sleep -Seconds 2
    }
}

# 1. Login
Write-Host "Logging in as Admin..."
$loginBody = @{
    username = $AdminUser
    password = $AdminPass
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable Session
    Write-Host "Login Successful"
} catch {
    Write-Error "Login failed: $_"
    exit 1
}

# 2. Reset
Write-Host "Triggering System Reset..."
try {
    $resetResponse = Invoke-WebRequest -Uri "$BaseUrl/admin/system/reset" -Method Post -WebSession $Session
    Write-Host "Reset Status: $($resetResponse.StatusCode)"
    Write-Host "Reset Output: $($resetResponse.Content)"
} catch {
    Write-Error "Reset Failed: $_"
    exit 1
}

# 3. Seed
Write-Host "Triggering User Seed..."
try {
    $seedResponse = Invoke-WebRequest -Uri "$BaseUrl/admin/system/seed-default" -Method Post -WebSession $Session
    Write-Host "Seed Status: $($seedResponse.StatusCode)"
    Write-Host "Seed Output: $($seedResponse.Content)"
} catch {
    Write-Error "Seed Failed: $_"
    exit 1
}

Write-Host "Reset and Seed Completed Successfully"
