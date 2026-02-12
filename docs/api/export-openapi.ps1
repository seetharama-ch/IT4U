# Export-OpenAPI.ps1
# Fetches the latest OpenAPI v3 JSON from the running IT4U backend

$ErrorActionPreference = "Stop"

$Port = 8060
# Check if 8061 is used (Prod default)
if (Test-NetConnection -ComputerName localhost -Port 8061 -InformationLevel Quiet) {
    $Port = 8061
}

$Url = "http://localhost:$Port/v3/api-docs"
$OutputFile = Join-Path $PSScriptRoot "it4u-openapi.json"

Write-Host "Fetching OpenAPI Spec from $Url ..."
try {
    Invoke-RestMethod -Uri $Url -OutFile $OutputFile
    Write-Host "✅ Successfully exported OpenAPI JSON to: $OutputFile" -ForegroundColor Green
} catch {
    Write-Error "Failed to fetch OpenAPI spec. Ensure backend is running. Error: $_"
}
