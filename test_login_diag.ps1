param(
  [string]$BaseUrl = "http://localhost:8060",
  [string]$AdminUser = "admin",
  [string]$AdminPass = "adminpass"
)

$ErrorActionPreference = "Stop"

function Login($user, $pass) {
    Write-Host "Attempting login for $user..."
    try {
        $body = @{ username = $user; password = $pass } | ConvertTo-Json
        # Use -SessionVariable to capture the session
        $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body -SessionVariable sess
        Write-Host "SUCCESS: $user" -ForegroundColor Green
        return @{ Response = $r; Session = $sess }
    } catch {
        Write-Host "FAILED: $user" -ForegroundColor Red
        Write-Host $_.Exception.Message
        if ($_.Exception.Response) {
             # Fix for reading response body in PowerShell Core/Desktop compatible way
             $stream = $_.Exception.Response.GetResponseStream()
             if ($stream) {
                 $reader = New-Object System.IO.StreamReader $stream
                 Write-Host $reader.ReadToEnd()
             }
        }
    }
}

Login $AdminUser $AdminPass
