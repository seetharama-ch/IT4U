$baseUrl = "http://localhost:8060/api"

function Get-AuthSession {
    param ($user, $pass)
    $loginBody = @{ username = $user; password = $pass } | ConvertTo-Json
    $tr = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
    $userInfo = $tr.Content | ConvertFrom-Json
    return @{ session = $sess; user = $userInfo }
}

try {
    # 1. Employee Creates Ticket
    Write-Host "1. Logging in as Employee..."
    $empData = Get-AuthSession "employee_e2e_20251225" "E2E@12345"
    $empSess = $empData.session
    $empUser = $empData.user
    Write-Host "Employee ID: $($empUser.id)"

    Write-Host "Creating Ticket..."
    $ticketBody = @{
        title = "E2E-FULLFLOW-20251225-TEST";
        description = "Full lifecycle test via API";
        priority = "HIGH";
        category = "HARDWARE";
        status = "OPEN";
        requester = @{ username = $empUser.username }; # Required by TicketService
        managerName = "manager_e2e_20251225" # Optional helper for setting manager
    } | ConvertTo-Json

    $tResp = Invoke-WebRequest -Uri "$baseUrl/tickets" -Method Post -Body $ticketBody -WebSession $empSess -ContentType "application/json"
    $ticket = $tResp.Content | ConvertFrom-Json
    $ticketId = $ticket.id
    Write-Host "Ticket Created: ID=$ticketId Number=$($ticket.ticketNumber) Status=$($ticket.status) MgrStatus=$($ticket.managerApprovalStatus)"

    # 2. Manager Approves
    Write-Host "2. Logging in as Manager..."
    $mgrData = Get-AuthSession "manager_e2e_20251225" "E2E@12345"
    $mgrSess = $mgrData.session

    Write-Host "Approving Ticket $ticketId..."
    # Using POST /approve
    $approveBody = @{ priority = "HIGH" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/approve" -Method Post -Body $approveBody -WebSession $mgrSess -ContentType "application/json"
    Write-Host "Ticket Approved."

    # 3. Support Assigns & In Progress
    Write-Host "3. Logging in as Support..."
    $supData = Get-AuthSession "support_e2e_20251225" "E2E@12345"
    $supSess = $supData.session
    $supId = $supData.user.id

    Write-Host "Support assigning to self (ID: $supId)..."
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/assign?userId=$supId" -Method Patch -WebSession $supSess
    
    Write-Host "Updating Status to IN_PROGRESS..."
    $progBody = @{ status = "IN_PROGRESS" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $progBody -WebSession $supSess -ContentType "application/json"
    
    # Add Comment
    $commentBody = @{ content = "Work started." } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/comments" -Method Post -Body $commentBody -WebSession $supSess -ContentType "application/json"
    Write-Host "Status Updated & Comment Added."

    # 4. Resolve & Close
    Write-Host "4. Support Resolving..."
    $resBody = @{ status = "RESOLVED" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $resBody -WebSession $supSess -ContentType "application/json"

    Write-Host "Support Closing..."
    $closeBody = @{ status = "CLOSED" } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -Body $closeBody -WebSession $supSess -ContentType "application/json"

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
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Error "Response Body: $($reader.ReadToEnd())"
    } else {
         Write-Error "Exception: $($_.Exception.Message)"
    }
    exit 1
}
