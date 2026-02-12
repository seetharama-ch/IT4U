$headers = @{ "Content-Type" = "application/json" }
$body = '{"username":"admin","password":"Admin@123"}'
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8060/api/auth/login" -Method Post -Headers $headers -Body $body
    Write-Host "Login Successful"
    $response | ConvertTo-Json
} catch {
    Write-Host "Login Failed"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
        $reader.ReadToEnd()
    }
}
