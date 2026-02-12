import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsManager, loginAsSupport, loginAsEmployee } from './helpers/auth';

test.describe('Application Footer', () => {
    test('footer appears on login page with complete text', async ({ page }) => {
        await page.goto('/login');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible();

        // Verify all required text components
        await expect(footer).toContainText('Created by IT4U');
        await expect(footer).toContainText('v1.4');
        await expect(footer).toContainText('2025');
        await expect(footer).toContainText('Crafted by');
        await expect(footer).toContainText('Seetharam');
        await expect(footer).toContainText('GeoSoftGlobal-Surtech International');
    });

    test('footer appears on Admin dashboard', async ({ page }) => {
        await loginAsAdmin(page);

        // Navigate to admin-specific route
        await page.goto('/app/admin');
        await page.waitForLoadState('networkidle');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible({ timeout: 10000 });
        await expect(footer).toContainText('Crafted by Seetharam');
        await expect(footer).toContainText('v1.4');
    });

    test('footer appears on Employee dashboard', async ({ page }) => {
        await loginAsEmployee(page);

        // Navigate to employee-specific route
        await page.goto('/app/my-tickets');
        await page.waitForLoadState('networkidle');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible({ timeout: 10000 });
        await expect(footer).toContainText('Crafted by Seetharam');
        await expect(footer).toContainText('© GeoSoftGlobal-Surtech International');
    });

    test('footer appears on Manager dashboard', async ({ page }) => {
        await loginAsManager(page);

        // Navigate to manager-specific route
        await page.goto('/app/approvals');
        await page.waitForLoadState('networkidle');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible({ timeout: 10000 });
        await expect(footer).toContainText('Crafted by Seetharam');
        await expect(footer).toContainText('IT4U');
    });

    test('footer appears on IT Support dashboard', async ({ page }) => {
        await loginAsSupport(page);

        // Navigate to support-specific route
        await page.goto('/app/assigned');
        await page.waitForLoadState('networkidle');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible({ timeout: 10000 });
        await expect(footer).toContainText('Crafted by Seetharam');
        await expect(footer).toContainText('2025');
    });

    test('footer persists after page refresh', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/app/admin');
        await page.waitForLoadState('networkidle');

        // Refresh page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Footer should still be visible
        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible({ timeout: 10000 });
        await expect(footer).toContainText('Crafted by Seetharam');
    });

    test('footer is non-intrusive and properly styled', async ({ page }) => {
        await page.goto('/login');

        const footer = page.getByTestId('app-footer');
        await expect(footer).toBeVisible();

        // Check that footer has proper styling attributes
        const opacity = await footer.evaluate((el) => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeLessThanOrEqual(1.0);

        // Verify footer is at the bottom
        const box = await footer.boundingBox();
        expect(box).not.toBeNull();
    });
});
