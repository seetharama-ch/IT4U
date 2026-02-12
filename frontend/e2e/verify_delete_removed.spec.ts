import { test, expect } from '@playwright/test';
import { setupE2EUser, getE2EUserId } from './_helpers/setup_e2e_users';

test.describe('Verify Delete Option Removed', () => {

    test('Admin should not see delete button in List or Details', async ({ page }) => {
        // 1. Login as Admin
        await page.goto(`${process.env.BASE_URL || 'https://gsg-mecm'}/login`);
        await page.fill('input[name="username"]', 'admin'); // Assuming admin exists
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/admin/);

        // 2. Create a ticket to ensure list is not empty
        await page.goto(`${process.env.BASE_URL || 'https://gsg-mecm'}/app/tickets/new`);
        await page.fill('input[name="title"]', 'Temp Ticket for Delete Check');
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.fill('textarea[name="description"]', 'Checking delete button removal');
        await page.click('button[type="submit"]');

        // Handle Success Modal
        await expect(page.getByTestId('ticket-success-modal')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('ticket-success-ok').click();

        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);

        // 3. Check Details Page
        await expect(page.getByTestId('ticket-delete-btn')).toBeHidden();

        // 4. Check List Page (Admin Dashboard)
        await page.goto(`${process.env.BASE_URL || 'https://gsg-mecm'}/app/admin`);
        await expect(page.getByTestId('ticket-row').first()).toBeVisible();
        await expect(page.getByTestId('ticket-delete-btn')).toBeHidden();
    });
});
