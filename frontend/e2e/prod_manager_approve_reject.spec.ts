import { test, expect } from '@playwright/test';
import { loginAs, logout } from './utils/login-helpers';

test.describe('PROD - Manager Approval', () => {

    test('Manager approves ticket', async ({ page }) => {
        // 1. Login as qa_mgr1
        await page.goto('/login');
        await page.fill('input[name="username"]', 'qa_mgr1');
        await page.fill('input[name="password"]', 'Test@1234');
        await page.click('button[type="submit"]');

        // 2. Go to Pending Approvals
        await page.goto('/app/manager/approvals');

        // 3. Find the ticket (Looking for "QA PROD Test Ticket")
        // Click "Details" or "View"
        // Assuming a table or list
        const row = page.getByRole('row').filter({ hasText: 'QA PROD Test Ticket' }).first();
        // If row exists, click View
        if (await row.isVisible()) {
            await row.getByRole('link', { name: /View|Details/i }).click();
        } else {
            // Fallback: try finding just the text link
            await page.getByText('QA PROD Test Ticket').first().click();
        }

        // 4. Approve
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        await page.getByRole('button', { name: /Approve/i }).click();

        // Verify Success "Forwarded as approved to IT team"
        await expect(page.getByText(/approved/i)).toBeVisible();

        // Verify status change in UI
        await expect(page.getByText('OPEN')).toBeVisible(); // Or APPROVED -> OPEN

        await logout(page);
    });
});
