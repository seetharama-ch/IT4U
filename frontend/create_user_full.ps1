$headers = @{ "Content-Type" = "application/json" }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"username":"admin","password":"Admin@123"}'

Write-Host "Logging in..."
try {
    Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $headers -Body $loginBody -WebSession $session
    Write-Host "Login successful."
} catch {
    Write-Host "Login Failed"
    exit
}

$userBody = '{"username":"test_full_2","password":"Pass@123","email":"full2@gsg.in","role":"MANAGER","department":"IT","jobTitle":"Manager","phoneNumber":"1234567890"}'
Write-Host "Creating user with FULL payload..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8060/api/users" -Method Post -Headers $headers -Body $userBody -WebSession $session
    Write-Host "Created User Successfully"
    $response | ConvertTo-Json
} catch {
    Write-Host "Create Failed"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
       $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
       $reader.ReadToEnd()
    }
}
