# Phase 4 Rejection API
$empUser = "emp_phase2b"
$empPass = "password"
$mgrUser = "mgr_phase2b"
$mgrPass = "password"

$empAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${empUser}:${empPass}"))
$mgrAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${mgrUser}:${mgrPass}"))

$mgrHeaders = @{ Authorization = "Basic $mgrAuth" }
$empHeaders = @{ Authorization = "Basic $empAuth" }

# 1. Create Ticket
$body = @{
    title = "Phase 4 Rejection Ticket"
    description = "To be rejected"
    priority = "LOW"
    category = "SOFTWARE"
    requester = @{ username = $empUser }
    managerName = $mgrUser
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $empHeaders -ContentType "application/json" -Body $body
$ticketId = $resp.id
Write-Host "Created Ticket ID: $ticketId"

# 2. Reject as Manager
$rejectBody = @{
    managerApprovalStatus = "REJECTED"
} | ConvertTo-Json

$url = "http://localhost:8060/api/tickets/$ticketId/approval"
try {
    # Using PATCH method (Invoke-RestMethod supports -Method Patch in newer PS, but safely sticking to curl logic or checking version?
    # PS 5.1 Invoke-RestMethod -Method Patch might not exist.
    # It supports custom verbs? No.
    # Safe to use curl.exe.
    
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        Write-Host "Using curl.exe for PATCH..."
        $jsonFile = "temp_reject.json"
        $rejectBody | Out-File $jsonFile -Encoding ASCII
        $authHeader = "Authorization: Basic $mgrAuth"
        # Use -d @filename
        curl.exe -X PATCH $url -H "Content-Type: application/json" -H $authHeader -d "@$jsonFile"
        Remove-Item $jsonFile -ErrorAction SilentlyContinue
    } else {
        # Fallback for PS Core or if Patch supported
        Invoke-RestMethod -Uri $url -Method Patch -Headers $mgrHeaders -ContentType "application/json" -Body $rejectBody
    }
} catch {
    Write-Host "Rejection Failed: $_"
    exit 1
}

# 3. Verify
# Fetch details
$verify = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets/$ticketId" -Method Get -Headers $empHeaders
Write-Host "`nFinal Status: $($verify.status)"
Write-Host "Approval Status: $($verify.managerApprovalStatus)"

if ($verify.managerApprovalStatus -eq "REJECTED") {
    Write-Host "Phase 4 Rejection PASS"
} else {
    Write-Host "Phase 4 Rejection FAIL"
}
