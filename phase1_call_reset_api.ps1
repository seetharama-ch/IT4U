# Call the new admin reset endpoint
$baseUrl = "http://localhost:8060"
$username = "admin"
$password = "Admin@123"

Write-Host "=== Calling Admin Reset API Endpoint ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as Admin
Write-Host "[Step 1] Logging in as ADMIN..." -ForegroundColor Yellow
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session

if ($loginResponse.StatusCode -eq 200) {
    Write-Host "[OK] Login successful" -ForegroundColor Green
} else {
    Write-Host "[ERR] Login failed" -ForegroundColor Red
    exit 1
}

# Step 2: Call the reset endpoint
Write-Host ""
Write-Host "[Step 2] Calling POST /api/admin/reset/full..." -ForegroundColor Yellow
try {
    $resetResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/reset/full" -Method POST -WebSession $session
    
    Write-Host "[OK] Reset API called successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  RESET API RESPONSE" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $resetResponse | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor White
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($resetResponse.success -eq $true) {
        Write-Host "[PASS] Phase 1 Verification PASSED" -ForegroundColor Green
        Write-Host "  - Tickets Deleted: $($resetResponse.ticketsDeleted)" -ForegroundColor Gray
        Write-Host "  - Users Deleted: $($resetResponse.usersDeleted)" -ForegroundColor Gray
        Write-Host "  - Users Kept: $($resetResponse.usersKept)" -ForegroundColor Gray
        Write-Host "  - Final User Count: $($resetResponse.finalUserCount)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Remaining User:" -ForegroundColor Green
        Write-Host "  Username: $($resetResponse.remainingUser.username)" -ForegroundColor White
        Write-Host "  Role: $($resetResponse.remainingUser.role)" -ForegroundColor White
        Write-Host "  Email: $($resetResponse.remainingUser.email)" -ForegroundColor White
    } else {
        Write-Host "[FAIL] Phase 1 Verification FAILED" -ForegroundColor Red
        Write-Host "  Error: $($resetResponse.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "[ERR] Failed to call reset API: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Cyan
