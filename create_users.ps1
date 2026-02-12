$baseUrl = "http://localhost:8060"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login as Admin
echo "Logging in as admin..."
$loginBody = @{
    username = "admin"
    password = "password"
} | ConvertTo-Json

try {
    # Uses /api/auth/login with JSON
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -SessionVariable session -ErrorAction Stop -ContentType "application/json"
    echo "Login successful."
} catch {
    echo "Login failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        echo "Error Details: $($reader.ReadToEnd())"
    }
    exit 1
}

# Helper function to create user
function Create-User {
    param (
        [string]$username,
        [string]$email,
        [string]$role,
        [string]$managerName
    )
    $userBody = @{
        username = $username
        password = "password"
        email = $email
        role = $role
        department = "QA"
        jobTitle = "Tester"
        phoneNumber = "1234567890"
        managerName = $managerName
    } | ConvertTo-Json

    echo "Creating user $username..."
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -Body $userBody -WebSession $session -ContentType "application/json"
        echo "Created $username explicitly."
    } catch {
        echo "Failed to create $username : $($_.Exception.Message)"
        if ($_.Exception.Response) {
             $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
             echo "Details: $($reader.ReadToEnd())"
        }
    }
}

# 2. Create Users
Create-User -username "mgr_api" -email "mgr_api@gsg.com" -role "MANAGER"
Create-User -username "emp_appr_api" -email "emp_appr_api@gsg.com" -role "EMPLOYEE" -managerName "mgr_api"
Create-User -username "emp_direct_api" -email "emp_direct_api@gsg.com" -role "EMPLOYEE"
