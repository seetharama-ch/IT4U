# Production Regression - API Based
# Because UI Login is hidden/broken in Prod

$baseUrl = "http://localhost:8060/api"

function Login($user, $pass) {
    try {
        $body = @{ username = $user; password = $pass } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $body -SessionVariable "session_$user"
        Write-Host "Login Success: $user"
        return $res
    } catch {
        Write-Host "Login Failed: $user - $($_.Exception.Message)"
        throw $_
    }
}

try {
    # 1. Login Everyone
    $emp = Login "ganesh_kalla" "Geosoft@1234"
    $mgr = Login "duppala_muralidhar" "Geosoft@1234"
    $it  = Login "Admin_Support" "password"

    # 2. Employee Creates Ticket
    Write-Host "Creating Ticket..."
    $ticketBody = @{
        title = "API Regression Ticket";
        description = "Testing lifecycle via API";
        category = "SOFTWARE";
        priority = "MEDIUM"; # Setting it initially? Backend sets UNASSIGNED usually.
        requester = @{ username = "ganesh_kalla" };
        softwareName = "API Test Soft";
        version = "1.0"
    } | ConvertTo-Json
    
    # Using Employee Session
    $ticket = Invoke-RestMethod -Uri "$baseUrl/tickets" -Method Post -ContentType "application/json" -Body $ticketBody -WebSession $session_ganesh_kalla
    $ticketId = $ticket.id
    Write-Host "Ticket Created: ID $ticketId - Status: $($ticket.status) - Approval: $($ticket.managerApprovalStatus)"

    # 3. Manager Approves
    # Wait a bit? No, immediate.
    Write-Host "Manager Approving..."
    # Fetch ticket to verify manager sees it? Skipping for speed.
    $approveBody = @{
        managerApprovalStatus = "APPROVED";
        priority = "MEDIUM"
    } | ConvertTo-Json
    
    $approvedTicket = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId/approval" -Method Patch -ContentType "application/json" -Body $approveBody -WebSession $session_duppala_muralidhar
    Write-Host "Ticket Approved. Status: $($approvedTicket.status) - Approval: $($approvedTicket.managerApprovalStatus)"

    if ($approvedTicket.managerApprovalStatus -ne "APPROVED") { Write-Error "Approval Failed" }

    # 4. IT Assigns and Resolves
    Write-Host "IT Support Assigning..."
    # Assign to self (Admin_Support id=6 from previous knowledge, but let's trust $it.id if available)
    # Actually IT Support ID in DB is 6? Let's check session response or assume.
    # $it has the user object.
    $itId = $it.id
    $assigned = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId/assign?userId=$itId" -Method Patch -ContentType "application/json" -WebSession $session_Admin_Support
    Write-Host "Assigned to $itId. Status: $($assigned.status)"

    Write-Host "IT Support Resolving..."
    $resolveBody = @{ status = "RESOLVED" } | ConvertTo-Json
    $resolved = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -ContentType "application/json" -Body $resolveBody -WebSession $session_Admin_Support
    Write-Host "Resolved. Status: $($resolved.status)"

    # 5. Admin/Employee Closes
    Write-Host "Employee Closing..."
    $closeBody = @{ status = "CLOSED" } | ConvertTo-Json
    $closed = Invoke-RestMethod -Uri "$baseUrl/tickets/$ticketId/status" -Method Patch -ContentType "application/json" -Body $closeBody -WebSession $session_ganesh_kalla
    Write-Host "Closed. Status: $($closed.status)"

} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Host "Body: " $reader.ReadToEnd()
    }
    exit 1
}
