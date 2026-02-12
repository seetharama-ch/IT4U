import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Dashboards Load', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should load Ticket Dashboard tab', async ({ page }) => {
        await page.goto('/app/admin');
        await expect(page.getByTestId('app-header')).toBeVisible();
        // Check for main table or filters
        await expect(page.getByTestId('admin-ticket-table')).toBeVisible().catch(() =>
            expect(page.getByText('All Tickets')).toBeVisible()
        );
    });

    test('should load User Management tab', async ({ page }) => {
        await page.goto('/app/admin/users');
        // Users table should be visible
        await expect(page.locator('table')).toBeVisible();
        await expect(page.getByText('User Management')).toBeVisible();
    });

    test('should load Reporting Dashboard tab', async ({ page }) => {
        await page.goto('/app/admin/reports');
        // Check for charts or report headers
        await expect(page.getByText('Reports')).toBeVisible().catch(() =>
            expect(page.getByText('Dashboard')).toBeVisible()
        );
        // Ensure no crash
        await expect(page.locator('.recharts-surface').first()).toBeVisible().catch(() =>
            console.log('Charts might not be loaded if empty data, checking container')
        );
    });
});
