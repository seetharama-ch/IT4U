# Phase 5 Support Flow API
$empUser = "emp_phase2b"
$empPass = "password"
$supUser = "sup_phase2b"
$supPass = "password"

$empAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${empUser}:${empPass}"))
$supAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${supUser}:${supPass}"))

$empHeaders = @{ Authorization = "Basic $empAuth" }
$supHeaders = @{ Authorization = "Basic $supAuth" }

# 1. Create Ticket (Without Manager - NETWORK Category should bypass approval)
$body = @{
    title = "Phase 5 Network Ticket"
    description = "Network issue - auto open"
    priority = "HIGH"
    category = "NETWORK"
    requester = @{ username = $empUser }
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $empHeaders -ContentType "application/json" -Body $body
$ticketId = $resp.id
Write-Host "Created Ticket ID: $ticketId"
Write-Host "Initial Status: $($resp.status) (Expected: OPEN)"

if ($resp.status -ne "OPEN") {
    Write-Host "FAIL: Ticket is not OPEN. Approval logic might be covering NETWORK?"
    # If fails, we might need to approve it first, but prompt says "Without approval... Support must see it"
}

# 2. Support Updates to IN_PROGRESS
$statusBody = @{ status = "IN_PROGRESS" } | ConvertTo-Json
# Use curl or PATCH method logic. Using curl for safety.
$url = "http://localhost:8060/api/tickets/$ticketId/status"

if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    $jsonFile = "temp_status.json"
    $statusBody | Out-File $jsonFile -Encoding ASCII
    $authHeader = "Authorization: Basic $supAuth"
    curl.exe -X PATCH $url -H "Content-Type: application/json" -H $authHeader -d "@$jsonFile"
    Remove-Item $jsonFile -ErrorAction SilentlyContinue
}

# 3. Support Updates to RESOLVED
$statusBody2 = @{ status = "RESOLVED" } | ConvertTo-Json
if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    $jsonFile = "temp_status2.json"
    $statusBody2 | Out-File $jsonFile -Encoding ASCII
    $authHeader = "Authorization: Basic $supAuth"
    
    # We need to verify the previous one worked? Assuming it did for now.
    curl.exe -X PATCH $url -H "Content-Type: application/json" -H $authHeader -d "@$jsonFile"
    Remove-Item $jsonFile -ErrorAction SilentlyContinue
}

# 4. Verify Final State
$verify = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets/$ticketId" -Method Get -Headers $supHeaders
Write-Host "`nFinal Status: $($verify.status)"

if ($verify.status -eq "RESOLVED") {
    Write-Host "Phase 5 Support Flow PASS"
} else {
    Write-Host "Phase 5 Support Flow FAIL"
}
