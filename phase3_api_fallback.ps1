# Phase 3 API Fallback
$user = "emp_phase2b"
$pass = "password"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${user}:${pass}"))
$headers = @{ Authorization = "Basic $auth" }

# 1. Create Ticket
$body = @{
    title = "Phase 3 Test Ticket (API)"
    description = "Testing attachment via API due to Browser Tool 429"
    priority = "MEDIUM"
    category = "HARDWARE"
    requester = @{ username = $user }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $headers -ContentType "application/json" -Body $body
$ticketId = $response.id
Write-Host "Created Ticket ID: $ticketId"

# 2. Upload Attachment
$filePath = "C:\Users\admin\.gemini\antigravity\brain\99098f31-c8af-47be-84c6-328beec61822\test_attachment.txt"
$url = "http://localhost:8060/api/tickets/$ticketId/attachments"

# PowerShell 5.1 Invoke-RestMethod -InFile doesn't support multipart easily with other fields (but we only have file).
# However, standard -InFile sends raw body. We need multipart.
# Using curl (if available) or constructing multipart manually.
# Windows usually has 'curl.exe' (real curl) or alias to Invoke-WebRequest.
# I will use curl.exe if available, else .NET HttpClient.

if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    Write-Host "Using curl.exe for upload..."
    curl.exe -X POST $url -u "${user}:${pass}" -F "file=@$filePath"
} else {
    Write-Host "curl.exe not found. Skipping attachment upload for now or need manual fix."
}

# 3. Verify
$verify = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets/$ticketId" -Method Get -Headers $headers
Write-Host "Ticket Status: $($verify.status)"
Write-Host "Attachments: $($verify.attachments.Count)"
