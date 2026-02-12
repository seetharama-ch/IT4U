$baseUrl = "http://localhost:8060"

Write-Host "Testing SSO Endpoints..."
try {
    # Check if /login page exists (should be 200)
    $resp = Invoke-WebRequest -Uri "$baseUrl/login" -Method Get
    Write-Host "Login Page: $($resp.StatusCode)"
    
    # Check if OAuth2 authorization endpoint exists/redirects
    # Attempting to access a protected resource might trigger redirect to /login
    # But usually clicking SSO button goes to /oauth2/authorization/{registrationId}
    # Let's try /oauth2/authorization/azure-active-directory or similar if known.
    # SecurityConfig says .oauth2Login(), so base path is /oauth2/authorization/...
    
    # We don't know the exact registration ID (e.g. google, microsoft).
    # But we can check if the login page CONTENT contains the link.
    if ($resp.Content -match "/oauth2/authorization/") {
        Write-Host "Found SSO Link in Login Page."
        $matches = [regex]::Matches($resp.Content, 'href="(/oauth2/authorization/[^"]+)"')
        foreach ($match in $matches) {
            Write-Host "  Link: $($match.Groups[1].Value)"
        }
    } else {
        Write-Host "No SSO Link found in Login Page HTML."
    }

} catch {
    Write-Host "Error accessing login: $_"
}
