# Phase 4 Manager Approval API
$empUser = "emp_phase2b"
$empPass = "password"
$mgrUser = "mgr_phase2b"
$mgrPass = "password"

$empAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${empUser}:${empPass}"))
$mgrAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${mgrUser}:${mgrPass}"))

$empHeaders = @{ Authorization = "Basic $empAuth" }
$mgrHeaders = @{ Authorization = "Basic $mgrAuth" }

# 1. Create Ticket Assigned to Manager
$body = @{
    title = "Phase 4 Approval Ticket"
    description = "Waiting for manager approval"
    priority = "MEDIUM"
    category = "SOFTWARE"
    requester = @{ username = $empUser }
    managerName = $mgrUser
} | ConvertTo-Json

$createResp = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $empHeaders -ContentType "application/json" -Body $body
$ticketId = $createResp.id
Write-Host "Created Ticket ID: $ticketId (Manager: $($createResp.managerName))"

# 2. Approve as Manager
$approveBody = @{
    priority = "HIGH"
} | ConvertTo-Json

$approveUrl = "http://localhost:8060/api/tickets/$ticketId/approve"
try {
    $approveResp = Invoke-RestMethod -Uri $approveUrl -Method Post -Headers $mgrHeaders -ContentType "application/json" -Body $approveBody
    Write-Host "Approval Response: Status=$($approveResp.status) ManagerStatus=$($approveResp.managerApprovalStatus)"
} catch {
    Write-Host "Approval Failed: $_"
    exit 1
}

# 3. Verify Final State
if ($approveResp.status -eq "OPEN" -and $approveResp.managerApprovalStatus -eq "APPROVED") {
    Write-Host "Phase 4 Approval PASS"
} else {
    Write-Host "Phase 4 Approval FAIL"
}
