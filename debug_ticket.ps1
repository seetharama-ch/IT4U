$baseUrl = "http://localhost:8060"

function Login {
    param ($username, $password)
    $body = @{ username = $username; password = $password } | ConvertTo-Json
    $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -SessionVariable sess -ContentType "application/json" | Out-Null
        return $sess
    } catch {
        Write-Error "Login failed for $username : $_"
        exit 1
    }
}

$sess = Login "admin" "password"

Write-Host "--- Ticket 66 (Should be PENDING, was OPEN) ---"
try {
    $t1 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/66" -Method Get -WebSession $sess
    $t1 | ConvertTo-Json -Depth 5 | Write-Host
} catch { "Failed to get T1" }

Write-Host "`n--- Ticket 67 (Should be OPEN) ---"
try {
    $t2 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/67" -Method Get -WebSession $sess
    $t2 | ConvertTo-Json -Depth 5 | Write-Host
} catch { "Failed to get T2" }
