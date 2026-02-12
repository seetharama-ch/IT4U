import { test, expect } from '@playwright/test';

test.describe('Admin User Delete Fix', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Auth
        await page.route('**/api/auth/me', async route => {
            await route.fulfill({ json: { authenticated: true, role: 'ADMIN', username: 'admin' } });
        });

        // Mock Users List
        await page.route('**/api/users', async route => {
            if (route.request().method() === 'GET') {
                const json = [
                    {
                        id: 1,
                        username: 'user_to_delete',
                        email: 'delete@example.com',
                        role: 'EMPLOYEE',
                        active: true
                    }
                ];
                await route.fulfill({ json });
            } else {
                await route.continue();
            }
        });

        await page.goto('/app/admin/users');
    });

    test('should delete user successfully and handle JSON response', async ({ page }) => {
        console.log('Test started: delete user');
        // Wait for loading to finish
        await expect(page.locator('text=Loading Users...')).not.toBeVisible();
        await expect(page.locator('table')).toBeVisible();

        // Mock Delete API with the NEW JSON response format
        await page.route('**/api/users/1', async route => {
            console.log('Intercepted DELETE request');
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'User deleted successfully' })
                });
            } else {
                await route.continue();
            }
        });

        // Click delete button
        console.log('Clicking delete button');
        await page.locator('button[title="Delete User"]').first().click();

        // Check modal
        await expect(page.locator('text=Are you sure you want to delete user')).toBeVisible();

        // Confirm delete
        console.log('Confirming delete');
        await page.click('button:has-text("Yes, Delete")');

        // Expect success message
        console.log('Waiting for success message');
        // The toast/message might be "User user_to_delete deleted successfully"
        // Check for partial match
        await expect(page.locator('text=deleted successfully')).toBeVisible();
    });

    test('should handle invalid user list response gracefully', async ({ page }) => {
        console.log('Test started: invalid response');
        // Force reload with bad data
        await page.route('**/api/users', async route => {
            await route.fulfill({
                status: 200,
                body: "This is not valid JSON"
            });
        });

        // Trigger reload
        await page.reload();

        // Wait for loading to finish
        await expect(page.locator('text=Loading Users...')).not.toBeVisible();

        // Should NOT crash (blank screen). Should probably show empty list.
        await expect(page.locator('text=User Management')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();

        // Check if rows are empty (header row exists)
        const rowCount = await page.locator('tbody tr').count();
        expect(rowCount).toBe(0);
    });
});
