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

# 2. Define Users
$users = @(
    @{ username="employee_e2e_20251225"; password="Password123!"; email="emp_e2e@gsg.in"; role="EMPLOYEE"; department="IT"; jobTitle="Engineer"; phoneNumber="1234567890"; fullName="Test Employee" },
    @{ username="manager_e2e_20251225"; password="Password123!"; email="mgr_e2e@gsg.in"; role="MANAGER"; department="IT"; jobTitle="Manager"; phoneNumber="1234567890"; fullName="Test Manager" },
    @{ username="admin_e2e_20251225"; password="Password123!"; email="adm_e2e@gsg.in"; role="ADMIN"; department="IT"; jobTitle="Admin"; phoneNumber="1234567890"; fullName="Test Admin" },
    @{ username="support_e2e_20251225"; password="Password123!"; email="sup_e2e@gsg.in"; role="IT_SUPPORT"; department="IT"; jobTitle="Support"; phoneNumber="1234567890"; fullName="Test Support" }
)

# 3. Create Users
foreach ($u in $users) {
    Write-Host "Creating user: $($u.username)..." -NoNewline
    $json = $u | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8060/api/users" -Method Post -Headers $headers -Body $json -WebSession $session
        Write-Host " SUCCESS" -ForegroundColor Green
    } catch {
        # Check if already exists (409 or similar) - usually backend returns 400/500 if exists
        $msg = $_.Exception.Message
        if ($msg -match "409" -or $msg -match "exists") {
             Write-Host " ALREADY EXISTS (Skipping)" -ForegroundColor Yellow
        } else {
             Write-Host " FAILED: $msg" -ForegroundColor Red
             # Print details if validation error
             if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
                Write-Host $reader.ReadToEnd() -ForegroundColor Red
             }
        }
    }
}
