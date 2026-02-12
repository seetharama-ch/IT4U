$ErrorActionPreference = "Stop"
$headers = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login as Admin
$loginBody = '{"username":"admin","password":"admin123"}'
Write-Host "Logging in as Admin..."
try {
    Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $headers -Body $loginBody -WebSession $session
    Write-Host "Login successful." -ForegroundColor Green
} catch {
    Write-Host "FATAL: Admin Login Failed." -ForegroundColor Red
    exit 1
}

# 2. Reset Passwords function
function Reset-Password($username, $newPass) {
    Write-Host "Resetting $username..." -NoNewline
    try {
        # 2a. Find User ID? Need to list all or find by username
        # Assuming backend has /api/users/{id} for update. 
        # Need to find ID first.
        # But backend might not have search by username?
        # Let's list all users and filter.
        $users = Invoke-RestMethod -Uri "http://localhost:8060/api/users" -Method Get -WebSession $session
        $target = $users | Where-Object { $_.username -eq $username }
        
        if ($target) {
            $id = $target.id
            $body = @{ newPassword = $newPass }
            $json = $body | ConvertTo-Json
            
            Invoke-RestMethod -Uri "http://localhost:8060/api/users/$id/reset-password" -Method Post -Headers $headers -Body $json -WebSession $session
            Write-Host " SUCCESS ($newPass)" -ForegroundColor Green
        } else {
             Write-Host " USER NOT FOUND" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Reset-Password "employee_e2e_20251225" "Password123!"
Reset-Password "manager_e2e_20251225" "Password123!"
Reset-Password "admin_e2e_20251225" "Password123!"
Reset-Password "support_e2e_20251225" "Password123!"
