$ErrorActionPreference = "Stop"
$pkg = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Try-Login ($pass) {
    $body = @{ username = "admin"; password = $pass } | ConvertTo-Json
    try {
        Write-Host "Attempting login with password: $pass"
        Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $pkg -Body $body -WebSession $session -ErrorAction Stop
        Write-Host "Login SUCCESS with $pass" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Login FAILED with $pass" -ForegroundColor Red
        return $false
    }
}

# 1. Try Login (Plain text 'Admin@123' per user report)
if (Try-Login "Admin@123") {
    # 2. Get Profile to get ID
    Write-Host "Fetching User Profile..."
    try {
        $me = Invoke-RestMethod -Uri "http://localhost:8060/api/auth/me" -Method Get -WebSession $session
        Write-Host "User ID: $($me.id)"
        
        # 3. Update Password to 'admin123'
        $me.password = "admin123"
        $json = $me | ConvertTo-Json -Depth 10
        Write-Host "Updating Admin Password to 'admin123'..."
        
        try {
            # Try /api/users/{id}
             Invoke-RestMethod -Uri "http://localhost:8060/api/users/$($me.id)" -Method Put -Headers $pkg -Body $json -WebSession $session
             Write-Host "Admin Password UPDATED to 'admin123'" -ForegroundColor Green
        } catch {
            Write-Host "Update Failed: $($_.Exception.Message)"
            # Try /api/users (maybe it's post for update? unlikely)
        }
        
    } catch {
        Write-Host "Failed to get profile: $($_.Exception.Message)"
    }
} elseif (Try-Login "admin123") {
    Write-Host "Password is already 'admin123'. No action needed." -ForegroundColor Green
} else {
    Write-Host "FATAL: Could not login as admin with either password." -ForegroundColor Red
    exit 1
}
