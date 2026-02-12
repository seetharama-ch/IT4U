$baseUrl = "http://localhost:8060/api"
$adminUser = "admin"
$adminPass = "admin123"

Write-Host "Logging in as Admin..."
$loginBody = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable session
    Write-Host "Login Successful."
} catch {
    Write-Error "Login Failed: $_"
    exit 1
}

$users = @(
    @{
        username = "manager_e2e_20251225"
        password = "E2E@12345"
        role = "MANAGER"
        email = "manager.e2e@test.com"
        department = "E2E Dept"
        jobTitle = "E2E Manager"
    },
    @{
        username = "employee_e2e_20251225"
        password = "E2E@12345"
        role = "EMPLOYEE"
        email = "employee.e2e@test.com"
        department = "E2E Dept"
        jobTitle = "E2E Employee"
        managerName = "manager_e2e_20251225"
    },
    @{
        username = "support_e2e_20251225"
        password = "E2E@12345"
        role = "IT_SUPPORT"
        email = "support.e2e@test.com"
        department = "IT"
        jobTitle = "E2E Support"
    }
)

foreach ($u in $users) {
    Write-Host "Creating user: $($u.username)..."
    try {
        $body = $u | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$baseUrl/users" -Method Post -Body $body -WebSession $session -ContentType "application/json"
        Write-Host "Created $($u.username): $($response.StatusCode)"
    } catch {
        $msg = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($msg)
        $errBody = $reader.ReadToEnd()
        Write-Host "Failed to create $($u.username): $errBody"
    }
}
