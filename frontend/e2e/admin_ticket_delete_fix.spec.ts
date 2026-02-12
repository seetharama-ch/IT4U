import { test, expect } from '@playwright/test';

test.describe('Admin Ticket Delete Fix', () => {
    // Remove storageState as we don't have it
    // test.use({ storageState: 'e2e/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        // Mock Auth Check
        await page.route('**/api/auth/me', async route => {
            await route.fulfill({ json: { authenticated: true, role: 'ADMIN', username: 'admin', id: 1 } });
        });

        // Mock Users list to prevent 401 from real backend which would trigger logout
        await page.route('**/api/users', async route => {
            await route.fulfill({ json: [{ id: 1, username: 'admin', role: 'ADMIN' }, { id: 2, username: 'employee', role: 'EMPLOYEE' }] });
        });

        // Ensure we are logically 'logged in' before visiting the protected route
        // We go directly to the page. The app should check /api/auth/me, get the mock, and allow access.
    });

    test('should delete ticket successfully and handle JSON response', async ({ page }) => {
        // Mock the tickets list response
        await page.route('**/api/tickets*', async route => {
            const json = {
                content: [
                    {
                        id: 999,
                        ticketNumber: 'GSG-00000000999',
                        title: 'Ticket to Delete',
                        status: 'OPEN',
                        priority: 'LOW',
                        createdAt: new Date().toISOString(),
                        requester: { username: 'employee' }
                    }
                ],
                totalPages: 1
            };
            await route.fulfill({ json });
        });

        // Mock the DELETE response with the new JSON format
        await page.route('**/api/tickets/999', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Ticket deleted successfully' })
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/app/admin');

        // Wait for ticket to be visible
        const deleteBtn = page.getByTestId('ticket-delete-btn').first();
        await expect(deleteBtn).toBeVisible();

        // Setup listener for console errors to catch "Unexpected end of JSON input"
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        // Click delete
        await deleteBtn.click();

        // Confirm in modal
        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true });
        await expect(confirmBtn).toBeVisible();
        await confirmBtn.click();

        // Expect successful toast or UI update
        await expect(page.getByText('Ticket deleted successfully')).toBeVisible();

        // Verify no crash/blank screen
        await expect(page.getByTestId('app-header')).toBeVisible();
    });

    test('should handle delete failure gracefully', async ({ page }) => {
        // Mock tickets
        await page.route('**/api/tickets*', async route => {
            const json = {
                content: [
                    {
                        id: 998,
                        ticketNumber: 'GSG-00000000998',
                        title: 'Ticket Fail Delete',
                        status: 'OPEN',
                        priority: 'LOW',
                        createdAt: new Date().toISOString(),
                        requester: { username: 'employee' }
                    }
                ],
                totalPages: 1
            };
            await route.fulfill({ json });
        });

        // Mock Error
        await page.route('**/api/tickets/998', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Internal Server Error' })
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/app/admin');
        const deleteBtn = page.getByTestId('ticket-delete-btn').first();
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true });
        await confirmBtn.click();

        // Expect error message
        await expect(page.getByText('Internal Server Error')).toBeVisible();

        // UI should still be alive
        await expect(page.getByTestId('app-header')).toBeVisible();
    });
});
