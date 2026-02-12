import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin Ticket Delete - Regression Test
 * Verifies:
 * 1. Confirm dialog appears on Delete click
 * 2. Successful deletion redirects to Admin Dashboard
 * 3. No blank screen/crash after deletion
 */

test.describe('Admin Ticket Delete Regression', () => {

    test.beforeEach(async ({ page, request }) => {
        // API Reset & Seed
        const loginResp = await request.post('http://localhost:8060/api/auth/login', {
            data: { username: 'admin', password: 'Admin@123' }
        });
        expect(loginResp.ok()).toBeTruthy();

        await request.post('http://localhost:8060/api/admin/system/reset');
        await request.post('http://localhost:8060/api/admin/system/seed-default');

        await loginAsAdmin(page);
    });

    test('should show confirm dialog and redirect after delete', async ({ page }) => {
        // Navigate to create
        await page.goto('/app/tickets/new');

        const title = `Delete Test ${Date.now()}`;
        await page.getByTestId('ticket-title').fill(title);
        await page.getByTestId('ticket-description').fill('Testing redirect after delete');
        await page.getByTestId('ticket-category').selectOption('OTHERS');

        // Intercept create to get ID
        const createPromise = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') && resp.status() === 200
        );
        await page.getByTestId('ticket-submit').click();
        const ticket = await (await createPromise).json();
        console.log(`Created ticket with ID: ${ticket.id}`);

        // Close success modal
        await page.getByTestId('ticket-success-ok').click();

        // Go to Admin Dashboard
        await page.goto('/app/admin');
        await page.waitForResponse(resp => resp.url().includes('/api/tickets') && resp.status() === 200);

        // Filter to PENDING to find the OTHERS ticket
        await page.getByTestId('admin-filter-pending').click();

        const row = page.locator(`tr:has-text("${title}")`);
        await expect(row).toBeVisible();

        // Click delete button (side panel or row button depending on UI)
        // In TicketDetails side panel
        await row.click(); // Open details
        await expect(page.getByTestId('ticket-delete-btn')).toBeVisible();
        await page.getByTestId('ticket-delete-btn').click();

        // Assert Confirm Dialog
        const dialog = page.getByTestId('delete-confirm-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('Are you sure you want to delete this ticket?');

        // Click Confirm
        const deleteApiPromise = page.waitForResponse(resp =>
            resp.url().includes(`/api/tickets/${ticket.id}`) && resp.status() === 204,
            { timeout: 60000 }
        );

        console.log(`Clicking confirm delete for ticket ${ticket.id}`);
        await page.getByTestId('confirm-delete-btn').evaluate((node: any) => node.click());

        await deleteApiPromise;

        // Assert Redirection
        await expect(page).toHaveURL(/\/app\/admin/);

        // Assert Ticket gone from list
        await expect(row).not.toBeVisible();

        // Assert UI remains stable
        await expect(page.getByTestId('app-header').first()).toBeVisible();
    });
});
