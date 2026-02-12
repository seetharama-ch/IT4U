$ErrorActionPreference = "Stop"
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n=== 🎯 Quick Test: Admin Excel Export ===`n" -ForegroundColor Cyan

# 1. Login as Admin
Write-Host "1. Login as Admin..." -NoNewline
try {
    $body = @{ username = "admin"; password = "password" } | ConvertTo-Json
    $login = Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json" -WebSession $sess
    Write-Host " [OK] (200 OK)" -ForegroundColor Green
}
catch { Write-Host " [FAILED] $_" -ForegroundColor Red; exit 1 }

# 2. Open Reports Page (Simulated via API)
Write-Host "2. Accessing Reports API..." -NoNewline
try {
    # Verify we can get data
    $data = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/reports/tickets?dateRange=thisMonth" -Method Get -WebSession $sess
    Write-Host " [OK] (Data Retrieved)" -ForegroundColor Green
}
catch { Write-Host " [FAILED] $_" -ForegroundColor Red; exit 1 }

# 3. Download Excel
Write-Host "3. Downloading Excel File..." -NoNewline
try {
    $outFile = "$PWD\admin_report_test.xlsx"
    $export = Invoke-WebRequest -Uri "http://localhost:8080/api/admin/reports/tickets/export?dateRange=thisMonth" -Method Get -WebSession $sess -OutFile $outFile -PassThru
    
    # Verify File Exists and Size
    if (Test-Path $outFile) {
        $size = (Get-Item $outFile).Length
        if ($size -gt 0) {
            # MIME Check if possible from headers
            $mime = $export.Headers["Content-Type"]
            Write-Host " [OK] (Saved to $outFile, Size: $size bytes)" -ForegroundColor Green
            Write-Host "    MIME Type: $mime" -ForegroundColor Gray
        }
        else {
            Write-Host " [FAILED] File is empty" -ForegroundColor Red
        }
    }
    else {
        Write-Host " [FAILED] File not downloaded" -ForegroundColor Red
    }
}
catch { Write-Host " [FAILED] $_" -ForegroundColor Red }

# 4. Security Check
Write-Host "4. Security Check (Unauthorized Access)..." -NoNewline
$badSess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $body = @{ username = "Engineer_1"; password = "Geosoft@1234" } | ConvertTo-Json
    Invoke-WebRequest -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json" -WebSession $badSess | Out-Null
    
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/api/admin/reports/tickets" -Method Get -WebSession $badSess | Out-Null
        Write-Host " [FAILED] Employee Accessed Reports!" -ForegroundColor Red
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            Write-Host " [OK] (Blocked 403 Forbidden)" -ForegroundColor Green
        }
        else {
            Write-Host " [FAILED] Wrong Status: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
catch { Write-Host " [FAILED] Login Error" -ForegroundColor Red }

Write-Host "`n=== ✅ Test Complete ===`n" -ForegroundColor Cyan
