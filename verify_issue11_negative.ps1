param(
  [string]$BaseUrl = "http://localhost:8060",
  [string]$EmpUser   = "d_shyam",
  [string]$EmpPass   = "password"
)

$ErrorActionPreference = "Stop"

function Login($user, $pass) {
  $body = @{ username = $user; password = $pass } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body -SessionVariable sess
  return @{ Session = $sess }
}

function AuthedHeaders($token) {
  return @{ Authorization = "Bearer $token" }
}

try {
    Write-Host "== Login as Employee =="
    $emp = Login $EmpUser $EmpPass

    Write-Host "== Check robustness: Create ticket missing requester (Should Succeed via Auth override) =="
    # Missing requester field in JSON. Backend should fill it.
    $bad = @{
      title="Negative Test Ticket";
      deviceDetails="gsg-pc-70"; 
      category="SOFTWARE"; 
      priority="HIGH";
      softwareName="X"; 
      softwareVersion="1"; 
      description="missing requester"
    } | ConvertTo-Json

    try {
      $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/tickets" -WebSession $emp.Session -ContentType "application/json" -Body $bad
      Write-Host "✅ Ticket created successfully (Requester auto-filled). ID: $($resp.id)"
    } catch {
      Write-Error "Ticket creation failed: $($_.Exception.Message)"
      if ($_.Exception.Response) {
         $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
         Write-Error "Response: $($reader.ReadToEnd())"
      }
      exit 1
    }
} catch {
    Write-Error "Script Failed: $($_.Exception.Message)"
    exit 1
}
