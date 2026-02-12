import { test, expect } from '@playwright/test';
import { createTicketViaAPI } from './helpers/tickets';

test.describe('Admin Delete Ticket Flow', () => {
    let ticketId: number;

    // Login as admin before all tests
    test.beforeEach(async ({ page }) => {
        // 1. Create a ticket to delete
        // Note: createTicketViaAPI needs 'page' which has 'request'
        const ticket = await createTicketViaAPI(page, {
            title: 'Ticket to Delete ' + Date.now(),
            description: 'This ticket will be deleted by admin',
            category: 'OTHERS',
            priority: 'LOW'
        });
        ticketId = ticket.id;

        // 2. Login as admin
        await page.goto('/login');
        await page.getByLabel('Username').fill('admin');
        await page.getByLabel('Password').fill('password'); // Default password
        await page.getByRole('button', { name: /Login/i }).click();
        await expect(page).toHaveURL(/\/app\/admin/);
    });

    test('Admin can delete a ticket and is redirected', async ({ page }) => {
        // Navigate to ticket details
        await page.goto(`/app/tickets/${ticketId}`);

        // Check if delete button exists and click it
        // Wait for button to be visible
        const deleteBtn = page.getByTestId('ticket-delete-btn');
        await deleteBtn.waitFor();
        await deleteBtn.click();

        // Verification: Modal should appear
        // Use data-testid from ConfirmDialog
        const modal = page.locator('[data-testid="delete-confirm-dialog"]');
        await expect(modal).toBeVisible();
        await expect(page.getByText('Are you sure you want to delete this ticket?')).toBeVisible();

        // Click Confirm (Delete)
        const confirmBtn = page.getByTestId('confirm-delete-btn');
        await confirmBtn.click();

        // Verification:
        // 1. Redirected to admin dashboard
        await expect(page).toHaveURL(/\/app\/admin/);

        // 2. NO Blank screen (body should have content)
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
        // Check for a known element on dashboard to ensure full render
        await expect(page.getByText('Ticket Management Dashboard')).toBeVisible({ timeout: 15000 });
    });

    test('Cancel delete keeps user on page', async ({ page }) => {
        // Navigate to ticket details
        await page.goto(`/app/tickets/${ticketId}`);

        // Click delete
        const deleteBtn = page.getByTestId('ticket-delete-btn');
        await deleteBtn.waitFor();
        await deleteBtn.click();

        // Click Cancel using data-testid
        const cancelBtn = page.getByTestId('cancel-delete-btn');
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();

        // Verification:
        // 1. Still on ticket details
        // Use RegExp to match URL end
        await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}`));

        // 2. Modal gone
        const modal = page.locator('[data-testid="delete-confirm-dialog"]');
        await expect(modal).not.toBeVisible();
    });
});
