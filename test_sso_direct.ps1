$baseUrl = "http://localhost:8060"

Write-Host "Testing SSO Direct Endpoints..."

# Common registration IDs: azure-active-directory, google, microsoft, okta
$ids = @("azure-active-directory", "microsoft", "google")

foreach ($id in $ids) {
    $url = "$baseUrl/oauth2/authorization/$id"
    Write-Host "Checking $url ..."
    try {
        # -MaximumRedirection 0 will make it error on 302, which allows us to catch the redirect location
        $resp = Invoke-WebRequest -Uri $url -Method Get -MaximumRedirection 0 -ErrorAction Stop
        Write-Host "  Response: $($resp.StatusCode)"
    } catch {
        # Check if it's a redirect (302 Found)
        if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::Found) {
            Write-Host "  SUCCESS: Redirects to $($_.Exception.Response.Headers["Location"])" -ForegroundColor Green
        } 
        elseif ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::NotFound) {
             Write-Host "  Not Found (404)"
        }
        else {
             Write-Host "  Error: $($_.Exception.Message)"
        }
    }
}
