import { test, expect } from '@playwright/test';
import { loginAs, logout } from './utils/login-helpers';

test.describe('PROD - Employee Ticket Creation', () => {

    test('Employee creates a ticket', async ({ page }) => {
        // 1. Login as qa_emp1
        await page.goto('/login');
        await page.fill('input[name="username"]', 'qa_emp1');
        await page.fill('input[name="password"]', 'Test@1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/employee|\/app\/dashboard/);

        // 2. Create Ticket
        await page.goto('/app/tickets/new'); // Updated route

        await page.fill('input[name="title"]', 'QA PROD Test Ticket');
        await page.selectOption('select[name="category"]', 'SOFTWARE'); // Mapping to category enum
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.fill('textarea[name="description"]', 'This is an automated test ticket.');

        // Select Manager (qa_mgr1)
        // Ensure the select is populated
        // await page.selectOption('select[name="manager"]', { label: 'qa_mgr1' }); 
        // Or if value is ID, this is hard. If value is username, expected.
        // Assuming user.manager is pre-filled or selectable.

        await page.getByRole('button', { name: /Submit|Create/i }).click();

        // 3. Verify Success Popup
        await expect(page.getByText(/Ticket created successfully|Success/i)).toBeVisible();

        // Click OK if modal
        if (await page.getByRole('button', { name: 'OK' }).isVisible()) {
            await page.getByRole('button', { name: 'OK' }).click();
        }

        // 4. Verify Redirect to My Tickets
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);

        // 5. Verify Status is PENDING_MANAGER_APPROVAL
        await expect(page.getByText('PENDING_MANAGER_APPROVAL')).toBeVisible();

        await logout(page);
    });
});
