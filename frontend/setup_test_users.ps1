$ErrorActionPreference = "Stop"
$headers = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$baseUrl = "http://localhost:8060"

# 1. Login as Admin
# Try standard credentials
$admins = @(
    @{ u="admin"; p="Admin@123" },
    @{ u="admin"; p="admin123" },
    @{ u="admin"; p="admin" }
)

$loggedIn = $false
foreach ($cred in $admins) {
    $loginBody = @{ username=$cred.u; password=$cred.p } | ConvertTo-Json
    Write-Host "Trying login with $($cred.p)..." -NoNewline
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Headers $headers -Body $loginBody -WebSession $session
        Write-Host " SUCCESS" -ForegroundColor Green
        $loggedIn = $true
        break
    } catch {
        Write-Host " FAILED" -ForegroundColor Yellow
    }
}

if (-not $loggedIn) {
    Write-Host "FATAL: Could not login as Admin." -ForegroundColor Red
    exit 1
}

# 2. Define Users
$users = @(
    @{ username="e2e_emp_01"; password="Pass@12345"; email="e2e_emp_01@gsg.in"; role="EMPLOYEE"; department="IT"; jobTitle="Engineer"; phoneNumber="1111111111"; fullName="E2E Employee 01" },
    @{ username="e2e_emp_02"; password="Pass@12345"; email="e2e_emp_02@gsg.in"; role="EMPLOYEE"; department="IT"; jobTitle="Engineer"; phoneNumber="1111111112"; fullName="E2E Employee 02" },
    @{ username="e2e_mgr_01"; password="Pass@12345"; email="e2e_mgr_01@gsg.in"; role="MANAGER"; department="IT"; jobTitle="Manager"; phoneNumber="2222222221"; fullName="E2E Manager 01" },
    @{ username="e2e_mgr_02"; password="Pass@12345"; email="e2e_mgr_02@gsg.in"; role="MANAGER"; department="IT"; jobTitle="Manager"; phoneNumber="2222222222"; fullName="E2E Manager 02" },
    @{ username="e2e_it_01";  password="Pass@12345"; email="e2e_it_01@gsg.in";  role="IT_SUPPORT"; department="IT"; jobTitle="Support"; phoneNumber="3333333331"; fullName="E2E IT Support 01" }
)

# 3. Create Users
foreach ($u in $users) {
    Write-Host "Creating user: $($u.username)..." -NoNewline
    $json = $u | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -Headers $headers -Body $json -WebSession $session
        Write-Host " CREATED" -ForegroundColor Green
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match "409" -or $msg -match "exists") {
             Write-Host " EXISTS (Skipping)" -ForegroundColor Yellow
        } else {
             Write-Host " FAILED: $msg" -ForegroundColor Red
             if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
                Write-Host $reader.ReadToEnd() -ForegroundColor Red
             }
        }
    }
}
