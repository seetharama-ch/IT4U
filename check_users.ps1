# Check current user state
$baseUrl = "http://localhost:8060"
$username = "admin"
$password = "Admin@123"

Write-Host "=== Checking Current User State ===" -ForegroundColor Cyan

# Login
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session

# Get users
$users = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method GET -WebSession $session

Write-Host ""
Write-Host "Total Users: $($users.Count)" -ForegroundColor Yellow
Write-Host ""

foreach ($user in $users) {
    Write-Host "- $($user.username) ($($user.role)) - $($user.email)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== User Analysis ===" -ForegroundColor Cyan
$hasEmployee = $users | Where-Object { $_.role -eq "EMPLOYEE" }
$hasManager = $users | Where-Object { $_.role -eq "MANAGER" }
$hasITSupport = $users | Where-Object { $_.role -eq "IT_SUPPORT" }
$hasAdmin = $users | Where-Object { $_.role -eq "ADMIN" }

Write-Host "Admin: $($hasAdmin.Count) user(s)" -ForegroundColor $(if($hasAdmin) {"Green"} else {"Red"})
Write-Host "Manager: $($hasManager.Count) user(s)" -ForegroundColor $(if($hasManager) {"Green"} else {"Red"})
Write-Host "Employee: $($hasEmployee.Count) user(s)" -ForegroundColor $(if($hasEmployee) {"Green"} else {"Red"})
Write-Host "IT Support: $($hasITSupport.Count) user(s)" -ForegroundColor $(if($hasITSupport) {"Green"} else {"Red"})

Write-Host ""
if ($hasAdmin -and $hasManager -and $hasEmployee -and $hasITSupport) {
    Write-Host "[OK] All required roles present - can proceed with ticket lifecycle testing" -ForegroundColor Green
} else {
    Write-Host "[WARN] Missing roles - need to create users" -ForegroundColor Yellow
}
