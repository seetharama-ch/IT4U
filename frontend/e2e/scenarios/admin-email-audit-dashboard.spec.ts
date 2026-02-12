import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../utils/utils';

test.describe('Admin Email Audit Dashboard', () => {
    test('Admin can view and filter email audit logs', async ({ page }) => {
        // 1. Login as Admin
        await loginAs(page, 'admin', 'password');

        // 2. Navigate to Email Audit Dashboard
        await page.goto('/admin/email-audit');
        await expect(page).toHaveURL(/\/admin\/email-audit/);
        await expect(page.getByRole('heading', { name: /Email Audit Log/i })).toBeVisible();

        // 3. Verify Filters exist
        await expect(page.getByLabel(/Status/i)).toBeVisible();
        await expect(page.getByLabel(/Event Type/i)).toBeVisible();
        await expect(page.getByLabel(/From Date/i)).toBeVisible();
        await expect(page.getByLabel(/To Date/i)).toBeVisible();

        // 4. Verify Table Headers
        await expect(page.getByRole('columnheader', { name: /Sent At/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /Recipient/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /Subject/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible();

        // 5. Verify Data Visibility
        // Since we ran happy-path, there should be emails.
        // We wait for at least one row in the table body
        const tableBody = page.locator('tbody');
        await expect(tableBody.locator('tr').first()).toBeVisible();

        // Check for specific known email subjects from previous tests
        // "Approval Required", "Ticket Approved", "Ticket Status Updated"
        // We might need to filter or reload to ensure they appear if pagination is involved.
        // But default view should show latest.
        await expect(page.getByText(/Approval Required/i).first()).toBeVisible();
    });
});
