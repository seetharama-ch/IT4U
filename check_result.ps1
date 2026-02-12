$baseUrl = "http://localhost:8060/api"
$adminUser = "admin"
$adminPass = "password"

$loginBody = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
$tr = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
Write-Host "Admin Login: OK"

# List Tickets
$tResp = Invoke-WebRequest -Uri "$baseUrl/tickets" -Method Get -WebSession $sess
$tickets = $tResp.Content | ConvertFrom-Json
$lastTicket = $tickets.content | Select-Object -Last 1
Write-Host "Last Ticket: $($lastTicket.ticketNumber) Status: $($lastTicket.status) MgrStatus: $($lastTicket.managerApprovalStatus)"

# Check Email Audit
try {
    $auditResp = Invoke-WebRequest -Uri "$baseUrl/admin/email-audit" -Method Get -WebSession $sess
    $audits = $auditResp.Content | ConvertFrom-Json
    Write-Host "Email Audits Found: $($audits.content.Count)"
    $audits.content | Select-Object sentAt, subject, recipient, status | Format-Table -AutoSize
} catch {
    Write-Host "Email Audit Failed or Not Available: $_"
}
