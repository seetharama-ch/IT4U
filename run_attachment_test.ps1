# ============================================
# Run PROD E2E Test for Attachments
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PROD E2E TEST - ATTACHMENTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Set-Location "d:\Workspace\gsg-IT4U\frontend"

Write-Host "Target: https://gsg-mecm" -ForegroundColor Yellow
Write-Host "Test: attachments_flow_prod.spec.ts`n" -ForegroundColor Yellow

Write-Host "[Running Test...]`n" -ForegroundColor Green

# Run the test
npx playwright test attachments_flow_prod.spec.ts --config=playwright.prod.config.ts --reporter=html,list

$testResult = $LASTEXITCODE

Write-Host "`n========================================" -ForegroundColor Cyan

if ($testResult -eq 0) {
    Write-Host "✓ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "✗ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "Review the report for details" -ForegroundColor Yellow
}

Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "View detailed report: npx playwright show-report`n" -ForegroundColor Cyan
