param(
  [string]$BaseUrl = "http://localhost:8060",
  [string]$AdminUser = "admin",
  [string]$AdminPass = "admin123",
  [string]$EmpUser   = "d_shyam",
  [string]$EmpPass   = "password"
)

$ErrorActionPreference = "Stop"

function Assert-NotNull($val, $msg) { if (-not $val) { throw $msg } }

function Login($user, $pass) {
  $body = @{ username = $user; password = $pass } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body -SessionVariable sess
  return @{ Session = $sess; Token = $r.token }
}

function AuthedHeaders($token) {
  return @{ Authorization = "Bearer $token" }
}

try {
    Write-Host "== 1) Login as Employee =="
    $emp = Login $EmpUser $EmpPass
    Assert-NotNull $emp.Token "Employee login failed (token missing)"

    Write-Host "== 2) Create ticket (must be 200/201, no 500) =="
    $ticketCreate = @{
      title = "API verify Issue11 close path"    # title is @Column(nullable = false)
      description = "API verify Issue11 close path"
      category = "OTHERS"                      # No Approval required
      priority = "HIGH"
      # Requester is auto-set by backend
    } | ConvertTo-Json

    # Adjust endpoint path:
    $createResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/tickets" `
      -WebSession $emp.Session -ContentType "application/json" -Body $ticketCreate

    $ticketId = $createResp.id
    Assert-NotNull $ticketId "Ticket create did not return id"
    Write-Host "Created ticketId=$ticketId"

    Write-Host "== 3) Login as Admin =="
    $admin = Login $AdminUser $AdminPass
    Assert-NotNull $admin.Token "Admin login failed (token missing)"

    Write-Host "== 4) Get ticket details (must be 200) =="
    $ticket = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/tickets/$ticketId" -WebSession $admin.Session
    Write-Host "Ticket status:" $ticket.status

    Write-Host "== 5) Close ticket (must be 200, no 500) =="
    # Adjust endpoint and payload to match your controller:
    $closeBody = @{ status = "CLOSED" } | ConvertTo-Json

    $closeResp = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/api/tickets/$ticketId/status" `
      -WebSession $admin.Session -ContentType "application/json" -Body $closeBody

    Write-Host "Close response status:" $closeResp.status

    Write-Host "== 6) Re-fetch ticket and assert CLOSED =="
    $ticket2 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/tickets/$ticketId" -WebSession $admin.Session
    if ($ticket2.status -ne "CLOSED") { throw "Expected CLOSED, got $($ticket2.status)" }

    Write-Host "✅ ISSUE 11 backend verification PASS: Create + Close works without 500"
} catch {
    Write-Error "Test Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        Write-Error "Response content: $($reader.ReadToEnd())"
    }
    exit 1
}
