import { test, expect } from '@playwright/test';
import { assertFooterStrict, checkFooterSoft } from './helpers/assertFooter';
import { loginAsProd, PROD_CREDENTIALS } from './helpers/prodHelpers';

/**
 * Responsive Layout E2E Tests
 * 
 * Validates application responsiveness across:
 * - Desktop (1920×1080)
 * - Laptop (1366×768)
 * - Tablet (768×1024)
 * - Mobile (375×812)
 * 
 * Run against production:
 * E2E_BASE_URL=https://gsg-mecm npx playwright test responsive_layout.spec.ts --config=playwright.prod.config.ts --headed
 */

const viewports = [
    { name: 'Desktop-FHD', width: 1920, height: 1080 },
    { name: 'Laptop', width: 1366, height: 768 },
    { name: 'Tablet-Portrait', width: 768, height: 1024 },
    { name: 'Tablet-Landscape', width: 1024, height: 768 },
    { name: 'Mobile-iPhone', width: 390, height: 844 },
    { name: 'Mobile-Android', width: 360, height: 640 },
];

test.describe('Responsive Layout Validation', () => {

    for (const viewport of viewports) {
        test(`Layout check - ${viewport.name} (${viewport.width}×${viewport.height})`, async ({ page }) => {
            // Set viewport
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            console.log(`[Responsive] Testing ${viewport.name} - ${viewport.width}×${viewport.height}`);

            // Navigate to login
            await page.goto('/login');
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });

            // Check footer (soft - don't block other checks)
            await checkFooterSoft(page);

            // Verify body is visible
            await expect(page.locator('body')).toBeVisible();

            // Check for horizontal scroll (overflow)
            const hasHorizontalOverflow = await page.evaluate(() => {
                return document.documentElement.scrollWidth > document.documentElement.clientWidth;
            });

            if (hasHorizontalOverflow) {
                console.warn(`[Responsive] ⚠️ Horizontal overflow detected on ${viewport.name}`);
            }
            expect(hasHorizontalOverflow).toBeFalsy();

            // Verify login form is visible and usable
            await expect(page.getByTestId('username-input')).toBeVisible();
            await expect(page.getByTestId('password-input')).toBeVisible();
            await expect(page.getByTestId('login-submit')).toBeVisible();

            // Check input widths are reasonable (not clipped)
            const usernameBox = await page.getByTestId('username-input').boundingBox();
            expect(usernameBox).not.toBeNull();
            expect(usernameBox!.width).toBeGreaterThan(100); // At least 100px wide

            console.log(`[Responsive] ✅ ${viewport.name} - Layout OK`);
        });
    }
});

test.describe('Mobile Interaction Tests', () => {

    test('Mobile login flow - 375×812 (iPhone)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });

        await page.goto('/login');

        // Footer check (soft)
        await checkFooterSoft(page);

        // Login as admin
        await page.getByTestId('username-input').fill(PROD_CREDENTIALS.admin.username);
        await page.getByTestId('password-input').fill(PROD_CREDENTIALS.admin.password);

        // Tap login button
        await page.getByTestId('login-submit').click();

        // Wait for navigation
        await page.waitForURL('**/app/admin', { timeout: 15000 });

        // Verify dashboard loaded
        expect(page.url()).toContain('/app/admin');

        // Check no horizontal overflow on dashboard
        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBeFalsy();

        // Footer check on dashboard
        await checkFooterSoft(page);

        console.log('[Mobile] ✅ Login flow successful on mobile viewport');
    });

    test('Mobile navigation - 360×640 (Android)', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 640 });

        await page.goto('/login');
        await loginAsProd(page, PROD_CREDENTIALS.admin.username, PROD_CREDENTIALS.admin.password);

        // Navigate to different pages
        const pages = [
            '/app/admin',
            '/app/admin/users',
            '/app/admin/reports',
        ];

        for (const path of pages) {
            await page.goto(path);
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });

            // Check overflow
            const hasOverflow = await page.evaluate(() => {
                return document.documentElement.scrollWidth > document.documentElement.clientWidth;
            });

            if (hasOverflow) {
                console.warn(`[Mobile] ⚠️ Overflow on ${path}`);
            }

            expect(hasOverflow).toBeFalsy();

            // Check footer
            await checkFooterSoft(page);
        }

        console.log('[Mobile] ✅ Navigation test passed');
    });

    test('Tablet landscape - 1024×768', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });

        await page.goto('/login');
        await loginAsProd(page, PROD_CREDENTIALS.admin.username, PROD_CREDENTIALS.admin.password);

        // Dashboard should be usable
        await expect(page.locator('body')).toBeVisible();

        // No overflow
        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBeFalsy();

        // Footer present
        await checkFooterSoft(page);

        console.log('[Tablet] ✅ Landscape orientation validated');
    });
});

test.describe('Modal & Form Responsiveness', () => {

    test('Session expiry modal fits on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });

        // Enable test mode
        await page.addInitScript(() => {
            window.IT4U_TEST_SESSION_TIMEOUT = 3 * 60 * 1000;
            window.IT4U_TEST_WARNING_TIME = 2 * 60 * 1000;
        });

        await page.goto('/login');
        await loginAsProd(page, PROD_CREDENTIALS.admin.username, PROD_CREDENTIALS.admin.password);

        // Wait for session warning
        console.log('[Mobile] Waiting for session modal (test mode)...');
        await page.waitForSelector('[data-testid="session-expiry-modal"]', { timeout: 135000 });

        const modal = page.locator('[data-testid="session-expiry-modal"]');
        await expect(modal).toBeVisible();

        // Check modal fits in viewport
        const modalBox = await modal.boundingBox();
        expect(modalBox).not.toBeNull();
        expect(modalBox!.width).toBeLessThanOrEqual(375); // Fits width
        expect(modalBox!.height).toBeLessThanOrEqual(812); // Fits height

        // Buttons should be tappable
        const stayBtn = page.getByTestId('stay-logged-in-btn');
        await expect(stayBtn).toBeVisible();

        const btnBox = await stayBtn.boundingBox();
        expect(btnBox).not.toBeNull();
        expect(btnBox!.height).toBeGreaterThan(30); // Large enough to tap

        console.log('[Mobile] ✅ Session modal fits and is usable');
    });
});

test.describe('Footer Responsiveness', () => {

    test('Footer wraps correctly on narrow screens', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 }); // Very narrow

        await page.goto('/login');

        const footer = page.getByTestId('app-footer');
        const footerExists = await footer.count() > 0;

        if (footerExists) {
            await expect(footer).toBeVisible();

            // Footer should not cause horizontal overflow
            const hasOverflow = await page.evaluate(() => {
                return document.documentElement.scrollWidth > document.documentElement.clientWidth;
            });

            expect(hasOverflow).toBeFalsy();

            console.log('[Footer] ✅ Footer responsive on 320px width');
        } else {
            console.warn('[Footer] ⚠️ Footer not present (deployment issue)');
        }
    });
});
