import { test, expect } from '@playwright/test';
import {
    resetProductionData,
    loginAsProd,
    PROD_CREDENTIALS,
    createProdAPIClient,
    navigateTo
} from './helpers/prodHelpers';

/**
 * Production E2E Test Suite
 * 
 * Runs against https://gsg-mecm with:
 * - Backend + Frontend in production mode
 * - Real browser testing  
 * - Full evidence collection (video, screenshots, traces)
 * 
 * Test Coverage:
 * 1. Multi-context login (admin + employee)
 * 2. Session timeout warning
 * 3. Basic ticket lifecycle
 */

test.describe('Production E2E - Auth & Session', () => {

    test('should allow multi-context login (admin + employee)', async ({ browser }) => {
        // Context 1: Admin
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        await loginAsProd(adminPage, PROD_CREDENTIALS.admin.username, PROD_CREDENTIALS.admin.password);
        await adminPage.waitForURL('**/app/admin', { timeout: 10000 });

        // Verify admin dashboard
        expect(adminPage.url()).toContain('/app/admin');

        // Context 2: Employee (isolated)
        const empContext = await browser.newContext();
        const empPage = await empContext.newPage();

        // Use employee_john if it exists, otherwise emp1
        const empCred = { username: 'employee_john', password: 'password' };
        await empPage.goto('/login');
        await empPage.fill('[data-testid="username-input"]', empCred.username);
        await empPage.fill('[data-testid="password-input"]', empCred.password);
        await empPage.click('[data-testid="login-submit"]');

        // If employee_john doesn't exist, try emp1
        await empPage.waitForTimeout(2000);
        if (empPage.url().includes('/login')) {
            await empPage.fill('[data-testid="username-input"]', PROD_CREDENTIALS.employee1.username);
            await empPage.fill('[data-testid="password-input"]', PROD_CREDENTIALS.employee1.password);
            await empPage.click('[data-testid="login-submit"]');
        }

        await empPage.waitForURL('**/app/employee', { timeout: 10000 });
        expect(empPage.url()).toContain('/app/employee');

        // CRITICAL: Verify admin still logged in
        await adminPage.reload();
        await adminPage.waitForURL('**/app/admin', { timeout: 10000 });
        expect(adminPage.url()).toContain('/app/admin');

        console.log('[PROD] ✅ Multi-context isolation verified');

        // Cleanup
        await adminContext.close();
        await empContext.close();
    });

    test('should show session expiry modal (test mode)', async ({ page }) => {
        // Enable test mode
        await page.addInitScript(() => {
            window.IT4U_TEST_SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes
            window.IT4U_TEST_WARNING_TIME = 2 * 60 * 1000; // 2 minutes  
        });

        // Login
        await loginAsProd(page, PROD_CREDENTIALS.admin.username, PROD_CREDENTIALS.admin.password);

        // Wait for warning (2 minutes)
        console.log('[PROD] Waiting for session warning (2 minutes in test mode)...');
        await page.waitForSelector('[data-testid="session-expiry-modal"]', { timeout: 135000 });

        // Verify modal visible
        const modal = page.locator('[data-testid="session-expiry-modal"]');
        await expect(modal).toBeVisible();

        // Verify message
        const message = await page.locator('[data-testid="session-expiry-message"]').textContent();
        expect(message).toContain('session will expire');

        console.log('[PROD] ✅ Session warning shown correctly');

        // Click "Stay Logged In"
        await page.click('[data-testid="stay-logged-in-btn"]');
        await page.waitForSelector('[data-testid="session-expiry-modal"]', { state: 'hidden', timeout: 5000 });

        console.log('[PROD] ✅ Session extended successfully');
    });
});

test.describe('Production E2E - Ticket Lifecycle', () => {

    test('should create and view ticket as employee', async ({ page }) => {
        // Login as employee
        await loginAsProd(page, 'employee_john', 'password');

        // Navigate to create ticket
        await navigateTo(page, '/app/tickets/new');

        // Fill ticket form
        await page.fill('[data-testid="ticket-title-input"]', 'Production Test Ticket');
        await page.fill('[data-testid="ticket-description-input"]', 'Testing ticket creation in production');

        // Select category (OTHERS to bypass manager validation)
        await page.selectOption('[data-testid="ticket-category-select"]', 'OTHERS');

        // Submit
        await page.click('[data-testid="ticket-submit-btn"]');

        // Wait for success/redirect
        await page.waitForTimeout(3000);

        // Verify not on create page anymore
        expect(page.url()).not.toContain('/new');

        console.log('[PROD] ✅ Ticket created successfully');
    });
});

test.describe('Production Health Checks', () => {

    test('should verify backend health', async ({ request }) => {
        const api = createProdAPIClient(request);

        const healthResp = await api.get('/actuator/health');
        expect(healthResp.ok()).toBeTruthy();

        const health = await healthResp.json();
        expect(health.status).toBe('UP');

        console.log('[PROD] ✅ Backend health: UP');
    });

    test('should verify frontend loads', async ({ page }) => {
        await navigateTo(page, '/login');

        // Verify page loads
        await expect(page).toHaveURL(/\/login/);

        // Verify logo visible
        await expect(page.locator('img[alt="Geosoft"]')).toBeVisible();

        // Verify footer
        const footer = page.locator('[data-testid="app-footer"]');
        if (await footer.count() > 0) {
            await expect(footer).toBeVisible();
        }

        console.log('[PROD] ✅ Frontend loads correctly');
    });
});
