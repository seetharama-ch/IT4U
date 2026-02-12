$ErrorActionPreference = "Stop"
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n=== STARTING VERIFICATION SUITE ===`n" -ForegroundColor Cyan

# 1. Admin Login
Write-Host "1. Testing Admin Login..." -NoNewline
try {
    $body = @{ username = "admin"; password = "password" } | ConvertTo-Json
    $login = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json" -WebSession $sess
    if ($login.StatusCode -eq 200) { Write-Host " [OK] (Session Established)" -ForegroundColor Green }
} catch { Write-Host " [FAILED] $_" -ForegroundColor Red; exit 1 }

# 2. Fetch Reports (JSON)
Write-Host "2. Fetching Report Data..." -NoNewline
try {
    $data = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/reports/tickets?dateRange=thisMonth" -Method Get -WebSession $sess
    if ($data.content.Count -ge 0) { 
        Write-Host " [OK] (Retrieved $($data.content.Count) tickets)" -ForegroundColor Green 
    } else {
        Write-Host " [WARNING] No data content found" -ForegroundColor Yellow
    }
} catch { Write-Host " [FAILED] $_" -ForegroundColor Red; exit 1 }

# 3. Test Export (Headers Only)
Write-Host "3. Testing Excel Export..." -NoNewline
try {
    $export = Invoke-WebRequest -Uri "http://localhost:8080/api/admin/reports/tickets/export" -Method Get -WebSession $sess
    $contentType = $export.Headers["Content-Type"]
    if ($contentType -like "*spreadsheetml*") {
         Write-Host " [OK] (MIME Type: $contentType)" -ForegroundColor Green 
    } else {
         Write-Host " [FAILED] Incorrect MIME Type: $contentType" -ForegroundColor Red
    }
} catch { Write-Host " [FAILED] $_" -ForegroundColor Red }

# 4. Unauthorized Access Test
Write-Host "4. Testing Unauthorized Access..." -NoNewline
$userSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
     # Login as employee
    $body = @{ username = "Engineer_1"; password = "Geosoft@1234" } | ConvertTo-Json
    $login = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json" -WebSession $userSess
    
    # Try to access reports
    try {
        $forbidden = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/reports/tickets" -Method Get -WebSession $userSess
        Write-Host " [FAILED] Employee was able to access reports!" -ForegroundColor Red
    } catch {
        # Check for 403 Forbidden
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
             Write-Host " [OK] (Access Denied as expected)" -ForegroundColor Green
        } else {
             Write-Host " [FAILED] Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch { Write-Host " [FAILED] Login failed for employee: $_" -ForegroundColor Red }

Write-Host "`n=== VERIFICATION COMPLETE ===`n" -ForegroundColor Cyan
