$baseUrl = "http://localhost:8060/api"

# Helper to login
function Get-AuthSession {
    param ($user, $pass)
    $loginBody = @{ username = $user; password = $pass } | ConvertTo-Json
    $tr = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
    return $sess
}

try {
    # 1. Employee Creates Ticket
    Write-Host "1. Logging in as Employee..."
    $empSess = Get-AuthSession "employee_e2e_20251225" "E2E@12345"
    
    Write-Host "Creating Ticket..."
    $ticketBody = @{
        title = "E2E-FULLFLOW-20251225-TEST";
        description = "Full lifecycle test via API";
        priority = "HIGH";
        category = "HARDWARE";
        status = "OPEN"
    } | ConvertTo-Json

    $tResp = Invoke-WebRequest -Uri "$baseUrl/tickets" -Method Post -Body $ticketBody -WebSession $empSess -ContentType "application/json"
    $ticket = $tResp.Content | ConvertFrom-Json
    $ticketId = $ticket.id
    $ticketNum = $ticket.ticketNumber
    Write-Host "Ticket Created: ID=$ticketId, No=$ticketNum, Status=$($ticket.status), MgrStatus=$($ticket.managerApprovalStatus)"

    if ($ticket.managerApprovalStatus -ne "PENDING") {
        Write-Error "CRITICAL: Manager Approval Status should be PENDING but is $($ticket.managerApprovalStatus)"
    }

    # 2. Manager Approves
    Write-Host "2. Logging in as Manager..."
    $mgrSess = Get-AuthSession "manager_e2e_20251225" "E2E@12345"

    Write-Host "Approving Ticket $ticketId..."
    $approveBody = @{
        action = "APPROVE";
        comment = "Approved via API E2E."
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "$baseUrl/manager/tickets/$ticketId/approval" -Method Post -Body $approveBody -WebSession $mgrSess -ContentType "application/json"
    Write-Host "Ticket Approved."

    # 3. Support Assigns & In Progress
    Write-Host "3. Logging in as Support..."
    $supSess = Get-AuthSession "support_e2e_20251225" "E2E@12345"

    Write-Host "Support assigning to self..."
    $assignBody = @{ action = "ASSIGN_SELF" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/it-support/tickets/$ticketId/assign" -Method Post -Body $assignBody -WebSession $supSess -ContentType "application/json"

    Write-Host "Updating Status to IN_PROGRESS..."
    $progBody = @{ status = "IN_PROGRESS"; comment = "Starting work." } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/it-support/tickets/$ticketId/status" -Method Put -Body $progBody -WebSession $supSess -ContentType "application/json"
    Write-Host "Status Updated."

    # 4. Resolve & Close
    Write-Host "4. Support Resolving..."
    $resBody = @{ status = "RESOLVED"; comment = "Fixed." } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/it-support/tickets/$ticketId/status" -Method Put -Body $resBody -WebSession $supSess -ContentType "application/json"

    Write-Host "Support Closing..."
    $closeBody = @{ status = "CLOSED"; comment = "Closed." } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/it-support/tickets/$ticketId/status" -Method Put -Body $closeBody -WebSession $supSess -ContentType "application/json"

    # 5. Verify Final State
    Write-Host "5. Verifying Final State (Employee)..."
    $chkResp = Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId" -Method Get -WebSession $empSess
    $finalTicket = $chkResp.Content | ConvertFrom-Json
    Write-Host "Final Status: $($finalTicket.status)"
    
    if ($finalTicket.status -eq "CLOSED") {
        Write-Host "E2E SUCCESS: Ticket lifecycle complete."
    } else {
        Write-Error "E2E FAIL: Final status is $($finalTicket.status)"
    }

} catch {
    Write-Error "E2E FAILED: $_"
    exit 1
}
