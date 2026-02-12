$ErrorActionPreference = "Stop"
Write-Host "`n=== Testing Login for All Roles ===`n" -ForegroundColor Cyan

$users = @(
    @{ Name = "Admin"; Username = "admin"; Role = "ADMIN" },
    @{ Name = "IT Support"; Username = "it_support_jane"; Role = "IT_SUPPORT" },
    @{ Name = "Manager"; Username = "manager_mike"; Role = "MANAGER" },
    @{ Name = "Employee"; Username = "Engineer_1"; Role = "EMPLOYEE" }
)

foreach ($u in $users) {
    $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $body = @{ username = $u.Username; password = "password" } | ConvertTo-Json
    
    Write-Host "Testing $($u.Name) ($($u.Username))..." -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json" -WebSession $sess
        
        if ($response.role -eq $u.Role) {
            Write-Host " [OK] (Role: $($response.role))" -ForegroundColor Green
        } else {
            Write-Host " [FAILED] Role Mismatch (Expected: $($u.Role), Got: $($response.role))" -ForegroundColor Red
        }
    } catch {
        Write-Host " [FAILED] Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Login Test Complete ===`n" -ForegroundColor Cyan
