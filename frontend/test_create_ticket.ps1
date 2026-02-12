$ErrorActionPreference = "Stop"
$headers = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login as Employee
$loginBody = '{"username":"employee_e2e_20251225","password":"Password123!"}'
Write-Host "Logging in as Employee..."
try {
    Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $headers -Body $loginBody -WebSession $session
    Write-Host "Login successful." -ForegroundColor Green
} catch {
    Write-Host "FATAL: Employee Login Failed." -ForegroundColor Red
    exit 1
}

# 2. Create Ticket
$ticketBody = '{"title":"Test Ticket API","description":"Testing Backend Creation","category":"HARDWARE","priority":"LOW"}'
Write-Host "Creating Ticket..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8060/api/tickets" -Method Post -Headers $headers -Body $ticketBody -WebSession $session
    Write-Host "Ticket Created Successfully: ID $($response.id)" -ForegroundColor Green
} catch {
    Write-Host "Create Ticket Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Host $reader.ReadToEnd() -ForegroundColor Red
    }
}
