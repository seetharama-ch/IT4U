# IT4U Production E2E Test Execution Script
# Run this from the frontend directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IT4U Production E2E Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "https://gsg-mecm" }
Write-Host "Base URL: $BASE_URL" -ForegroundColor Yellow
Write-Host ""

# Menu
Write-Host "Select test suite to run:" -ForegroundColor Green
Write-Host "1. Login - No Demo Credentials (Quick)" -ForegroundColor White
Write-Host "2. Admin Delete Regression Test (Quick)" -ForegroundColor White
Write-Host "3. Setup E2E Users (One-time setup)" -ForegroundColor White
Write-Host "4. Full Lifecycle Test (Comprehensive)" -ForegroundColor White
Write-Host "5. Run ALL Tests (Full Suite)" -ForegroundColor White
Write-Host "6. Generate HTML Report (from last run)" -ForegroundColor White
Write-Host "7. List All Available Tests" -ForegroundColor White
Write-Host "Q. Quit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice"

switch ($choice) {
    "1" {
        Write-Host "`nRunning: Login - No Demo Credentials..." -ForegroundColor Cyan
        npx playwright test login_no_demo_credentials.spec.ts --config=playwright.prod.config.ts --headed
    }
    "2" {
        Write-Host "`nRunning: Admin Delete Regression Test..." -ForegroundColor Cyan
        npx playwright test admin_delete_ticket_blank_screen.spec.ts --config=playwright.prod.config.ts --headed
    }
    "3" {
        Write-Host "`nRunning: Setup E2E Users..." -ForegroundColor Cyan
        Write-Host "This will create test users in the production database" -ForegroundColor Yellow
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            npx playwright test setup_e2e_users.spec.ts --config=playwright.prod.config.ts
        }
    }
    "4" {
        Write-Host "`nRunning: Full Lifecycle Test..." -ForegroundColor Cyan
        npx playwright test prod_full_lifecycle_api_first.spec.ts --config=playwright.prod.config.ts --headed
    }
    "5" {
        Write-Host "`nRunning: Full E2E Test Suite..." -ForegroundColor Cyan
        Write-Host "Order: Login → Delete Regression → User Setup → Full Lifecycle" -ForegroundColor Yellow
        Write-Host ""
        npx playwright test `
            login_no_demo_credentials.spec.ts `
            admin_delete_ticket_blank_screen.spec.ts `
            setup_e2e_users.spec.ts `
            prod_full_lifecycle_api_first.spec.ts `
            --config=playwright.prod.config.ts
    }
    "6" {
        Write-Host "`nGenerating HTML Report..." -ForegroundColor Cyan
        npx playwright show-report
    }
    "7" {
        Write-Host "`nListing all available tests..." -ForegroundColor Cyan
        npx playwright test --list --config=playwright.prod.config.ts
    }
    "Q" {
        Write-Host "`nExiting..." -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host "`nInvalid choice!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test execution completed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
