# ====== CONFIG ======
$BaseUrl = "http://localhost:8060"
# Local admin credentials for API access (bypassing SSO)
$Username = "admin"
# Ensure you set this environment variable or replace with actual password for testing
$Password = $env:ADMIN_PASSWORD
if (-not $Password) { $Password = "password" } # Default fallback match DataInitializer

Write-Host "Using Base URL: $BaseUrl"
Write-Host "Using Username: $Username"

# ====== 1) Login (Local Auth) ======
Write-Host "Logging in..."
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginBody = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" `
        -Body $loginBody -ContentType "application/json" -WebSession $session
    Write-Host "Login Successful. User: $($loginResponse.username)"
} catch {
    Write-Error "Login Failed: $_"
    exit 1
}

# ====== 2) Create Ticket ======
Write-Host "Creating Ticket..."
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ticketBody = @{
    title = "REG-SSO-MAIL-PROD-$timestamp"
    category = "OTHERS" # Matching Enum
    priority = "MEDIUM"  # Matching Enum
    description = "Automated regression ticket create to verify email pipeline."
    requester = @{
        username = $Username
    }
} | ConvertTo-Json

try {
    $ticket = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/tickets" `
        -Body $ticketBody -ContentType "application/json" -WebSession $session
    
    Write-Host "Created Ticket ID:" $ticket.id
    Write-Host "Ticket Number:" $ticket.ticketNumber
} catch {
    Write-Error "Create Ticket Failed: $_"
    exit 1
}

# ====== 3) Verify Email Audit (via API) ======
Write-Host "Verifying Email Audit Logs (Waiting 3s for Async process)..."
Start-Sleep -Seconds 3
try {
    $auditResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/email-audit?ticketId=$($ticket.id)" `
        -WebSession $session
    
    if ($auditResponse.content) {
         # Pagination response usually has 'content' array
         $rows = $auditResponse.content
    } else {
         # Or it might be direct array depending on config, but Page<T> matches .content
         $rows = $auditResponse
    }



    if ($auditResponse.totalElements -gt 0) {
        Write-Host "SUCCESS: Found $($auditResponse.totalElements) email audit logs."
        $rows | ForEach-Object { 
            Write-Host " - [$($_.status)] Type: $($_.eventType) | To: $($_.toEmail)" 
        }
    } else {
        Write-Warning "FAILURE: No email audit logs found for Ticket ID $($ticket.id)"
    }
} catch {
    Write-Error "Failed to fetch email audit logs: $_"
}

