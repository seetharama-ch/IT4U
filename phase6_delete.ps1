# Phase 6 Admin Delete API
$adminUser = "admin"
$adminPass = "Admin@123"
$empUser = "emp_phase2b"
$empPass = "password"

$adminAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${adminUser}:${adminPass}"))
$empAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${empUser}:${empPass}"))

$adminHeaders = @{ Authorization = "Basic $adminAuth" }
$empHeaders = @{ Authorization = "Basic $empAuth" }

# 1. Create Ticket to Delete
$body = @{
    title = "Phase 6 Delete Ticket"
    description = "To be deleted"
    priority = "LOW"
    category = "OTHERS"
    requester = @{ username = $empUser }
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $empHeaders -ContentType "application/json" -Body $body
$ticketId = $resp.id
Write-Host "Created Ticket ID: $ticketId"

# 2. Delete as Admin
$deleteUrl = "http://localhost:8060/api/tickets/$ticketId"

if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    Write-Host "Using curl.exe for DELETE..."
    $authHeader = "Authorization: Basic $adminAuth"
    # Capture output to check for 204 or 200
    curl.exe -X DELETE $deleteUrl -H $authHeader -I
} else {
    Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $adminHeaders
}

# 3. Verify it is gone (or marked deleted)
# API get should return 404 or verify "deleted=true" if we can see it as Admin (depends on implementation).
# TicketController calls ticketAccessService.canViewTicket.
# If deleted, does it show?
# Ticket entity has soft delete.
# TicketRepository filter 'deleted = false' usually.
# Let's try to get it.

try {
    $verify = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets/$ticketId" -Method Get -Headers $adminHeaders
    Write-Host "`nVerify Status: Found (Should be Not Found or Deleted)"
    if ($verify.deleted -eq $true) {
         Write-Host "Ticket is marked deleted (Soft Delete Verified)"
         Write-Host "Phase 6 Admin Delete PASS"
    } else {
         # If repository filters it out, we might get 404/500/Empty?
         # Check logs if we get here. 
         Write-Host "Ticket found but deleted flag is $($verify.deleted)"
    }
} catch {
    # 404 is good for soft delete if default scope hides it
    Write-Host "`nVerify Status: $($_.Exception.Message)"
    if ($_.Exception.Message -like "*404*") {
        Write-Host "Phase 6 Admin Delete PASS (404 Not Found)"
    } else {
        Write-Host "Phase 6 Admin Delete FAIL"
    }
}
