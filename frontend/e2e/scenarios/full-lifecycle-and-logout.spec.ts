import { test, expect, Page } from '@playwright/test';
import { loginAs, logout } from '../utils/utils';

test.describe('Full Ticket Lifecycle & Logout Verification', () => {

    test('Employee creates ticket -> Logout -> Manager approves -> Logout -> Admin resolves -> Logout', async ({ page }) => {
        test.setTimeout(120000); // Increase timeout for slow environment
        // 1. Login as Employee
        await loginAs(page, 'employee_john', 'password');

        // 2. Create Ticket
        await page.goto('/app/tickets/new');
        await page.getByLabel('Title').fill('Lifecycle Test Ticket');
        await page.getByLabel('Description').fill('Testing full lifecycle and logout.');
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.selectOption('select[name="priority"]', 'MEDIUM');

        // Submit
        await page.click('button[type="submit"]');

        // Verify Success Toast & Redirect
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        await expect(page.getByText('Ticket created successfully')).toBeVisible();

        // Capture Ticket ID
        const url = page.url();
        const ticketId = url.split('/').pop();
        console.log(`Created Ticket ID: ${ticketId}`);

        // 3. Logout as Employee
        await logout(page);
        await expect(page).toHaveURL(/\/login/);

        // 4. Login as Manager
        await loginAs(page, 'manager_mike', 'password');

        // 5. Approve Ticket
        // Navigate directly or find in list. Let's navigate directly to save time/flakiness
        await page.goto(`/app/tickets/${ticketId}`);
        await expect(page.getByText('Testing full lifecycle')).toBeVisible();

        // Approve
        await page.locator('input[value="APPROVED"]').check(); // Assuming radio button
        // Priority might be required if Security, but we chose Hardware.
        // Check if priority select is visible
        if (await page.isVisible('select')) {
            await page.selectOption('select', 'MEDIUM');
        }
        await page.getByRole('button', { name: 'Submit Review' }).click();

        // Verify Approval
        await expect(page.getByText('APPROVED')).toBeVisible();

        // 5b. Manager Create Ticket Verification
        await page.goto('/app/tickets/new');
        await page.getByLabel('Title').fill('Manager Created Ticket');
        await page.getByLabel('Description').fill('Manager creating ticket test.');
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.selectOption('select[name="priority"]', 'HIGH');
        await page.click('button[type="submit"]');

        // Verify Manager Redirect
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        await expect(page.getByText('Ticket created successfully')).toBeVisible();

        // 6. Logout as Manager
        await logout(page);

        // 7. Login as Admin
        await loginAs(page, 'admin', 'password');

        // 8. Resolve Ticket
        await page.goto(`/app/tickets/${ticketId}`);
        await page.click('button:has-text("Mark Resolved")'); // Adjust selector based on actual button text

        // Verify Resolved
        await expect(page.getByText('RESOLVED')).toBeVisible();

        // 9. Admin Create Ticket Verification
        await page.goto('/app/tickets/new');
        await page.getByLabel('Title').fill('Admin Created Ticket');
        await page.getByLabel('Description').fill('Admin creating ticket test.');
        await page.selectOption('select[name="category"]', 'SOFTWARE');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.click('button[type="submit"]');

        // Verify Admin Redirect
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        await expect(page.getByText('Ticket created successfully')).toBeVisible();

        // 10. Final Logout
        await logout(page);
    });
});
