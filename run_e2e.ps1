# Run E2E Tests for Issue 10 and 11
$ErrorActionPreference = "Stop"

Write-Host ">>> Starting E2E Verification..." -ForegroundColor Cyan

# 1. Check Backend Port 8060
$backend = Get-NetTCPConnection -LocalPort 8060 -ErrorAction SilentlyContinue
if (!$backend) {
    Write-Error "Backend is NOT running on port 8060. Please start it with './run-prod.ps1' or similar."
} else {
    Write-Host ">>> Backend detected on Port 8060." -ForegroundColor Green
}

# 2. Run Playwright Smoke Suites
Write-Host ">>> Running Smoke Suites (Issue 10 & 11)..." -ForegroundColor Yellow
cd frontend

Write-Host ">>> Invoking Playwright via NPM..."
# Using npm run to ensure correct environment and node resolution
& npm.cmd run test:e2e -- e2e/smoke.issue10.spec.ts e2e/smoke.issue11.spec.ts --retries=1 --reporter="line,list"

if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> ALL TESTS PASSED." -ForegroundColor Green
} else {
    Write-Error ">>> E2E Tests FAILED with Exit Code $LASTEXITCODE"
}

