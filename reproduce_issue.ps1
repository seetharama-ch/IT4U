$ErrorActionPreference = "Stop"

# Login
Write-Host "Logging in as admin..."
$body = @{ username = "admin"; password = "password" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Body $body -ContentType "application/json" -SessionVariable sess

# Get Ticket ID 1
Write-Host "Fetching Ticket 1..."
try {
    $ticket = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets/1" -Method Get -WebSession $sess
    Write-Host "Success!" -ForegroundColor Green
    $ticket | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Failed to fetch ticket!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    
    # Try to read the error body
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error Body: $errorBody"
}
