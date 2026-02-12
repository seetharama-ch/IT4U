$baseUrl = "http://localhost:8060"

function Login {
    param ($username, $password)
    Write-Host "Logging in as $username..." -ForegroundColor Cyan
    $body = @{ username = $username; password = $password } | ConvertTo-Json
    $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -SessionVariable sess -ContentType "application/json" | Out-Null
        return $sess
    } catch {
        Write-Error "Login failed for $username : $_"
        exit 1
    }
}

# 1. Emp Create Approval Ticket
Write-Host "`n1. Emp Approval Flow (Category: SOFTWARE)..." -ForegroundColor Yellow
$sess = Login "emp_appr_api" "password"
$ticket = @{
    title = "API Approval Ticket V2"
    description = "Via PowerShell V2"
    category = "SOFTWARE"
    priority = "MEDIUM"
    requester = @{ username = "emp_appr_api" }
    managerName = "mgr_api"
    deviceDetails = "PowerShellHost"
} | ConvertTo-Json -Depth 3

try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/tickets" -Method Post -Body $ticket -WebSession $sess -ContentType "application/json"
    $ticketId1 = $resp.id
    Write-Host "Created Ticket $ticketId1 (Status: $($resp.status), MgrStatus: $($resp.managerApprovalStatus))" -ForegroundColor Green
} catch {
    Write-Error "Failed to create ticket: $_"
    exit 1
}

# 2. Manager Approve
Write-Host "`n2. Manager Approval..." -ForegroundColor Yellow
$sess = Login "mgr_api" "password"
# Payload includes 'title' and 'category' to satisfy @NotNull validation on Ticket entity if enforced
$approvalBody = @{
    priority = "MEDIUM"
    title = "Approval Action" 
    category = "SOFTWARE"
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/api/tickets/$ticketId1/approve" -Method Post -Body $approvalBody -WebSession $sess -ContentType "application/json" | Out-Null
    Write-Host "Approved Ticket $ticketId1" -ForegroundColor Green
} catch {
    Write-Error "Failed to approve ticket: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}

# 3. Emp Create Direct Ticket
Write-Host "`n3. Emp Direct Flow (Category: NETWORK)..." -ForegroundColor Yellow
$sess = Login "emp_direct_api" "password"
$ticketDirect = @{
    title = "API Direct Ticket V2"
    description = "Via PowerShell V2"
    category = "NETWORK"
    priority = "HIGH"
    requester = @{ username = "emp_direct_api" }
    deviceDetails = "PowerShellHost"
} | ConvertTo-Json -Depth 3

try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/tickets" -Method Post -Body $ticketDirect -WebSession $sess -ContentType "application/json"
    $ticketId2 = $resp.id
    Write-Host "Created Ticket $ticketId2 (Status: $($resp.status))" -ForegroundColor Green
} catch {
    Write-Error "Failed to create direct ticket: $_"
}

# 4. Admin Close Both
Write-Host "`n4. Admin Processing..." -ForegroundColor Yellow
$sess = Login "admin" "password"

# Verify 1 is OPEN (Expecting OPEN now if approval worked)
try {
    $t1 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/$ticketId1" -Method Get -WebSession $sess
    Write-Host "Ticket 1 Status: $($t1.status) (Expected: OPEN)" -ForegroundColor Cyan
} catch { Write-Error "Failed to fetch T1" }

# Verify 2 is OPEN
try {
    $t2 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/$ticketId2" -Method Get -WebSession $sess
    Write-Host "Ticket 2 Status: $($t2.status) (Expected: OPEN)" -ForegroundColor Cyan
} catch { Write-Error "Failed to fetch T2" }

# Close 1
# Include dummy fields in case validaiton applies here too
$statusBody = @{ 
    status = "CLOSED"
    title = "Close Action"
    category = "SOFTWARE" 
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/api/tickets/$ticketId1/status" -Method Patch -Body $statusBody -WebSession $sess -ContentType "application/json" | Out-Null
    Write-Host "Closed Ticket 1" -ForegroundColor Green
} catch { Write-Error "Failed to close T1: $_" }

# Close 2
$statusBody2 = @{ 
    status = "CLOSED"
    title = "Close Action"
    category = "NETWORK" 
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/api/tickets/$ticketId2/status" -Method Patch -Body $statusBody2 -WebSession $sess -ContentType "application/json" | Out-Null
    Write-Host "Closed Ticket 2" -ForegroundColor Green
} catch { Write-Error "Failed to close T2: $_" }

Write-Host "API Verification Complete" -ForegroundColor White
