# Swagger Export Guide

For integration with external tools (Postman, Confluence, API Gateways), you can export the OpenAPI v3 specification.

## Automated Export Script
A PowerShell script is available to fetch the latest contract from the running backend.

**Script:** `docs/api/export-openapi.ps1`
**Usage:**
```powershell
.\docs\api\export-openapi.ps1
```

**Output:**
*   Saves JSON to `docs/api/it4u-openapi.json`.

## Manual Method
1.  Ensure backend is running (Port 8060 or 8061).
2.  Navigate to `http://localhost:8060/v3/api-docs` (or 8061).
3.  Save the JSON response/file.

## Sharing
*   **Confluence:** Use the Swagger/OpenAPI macro by pointing it to this raw JSON file URL (if hosted) or pasting the content.
*   **Postman:** Import -> Link -> Paste URL or File.
