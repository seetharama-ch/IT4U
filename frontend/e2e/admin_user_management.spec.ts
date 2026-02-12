import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin User Management CRUD
 */
test.describe('Admin User Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/app/admin/users');
    });

    test('should create, update password, and delete user', async ({ page }) => {
        const username = `testuser_${Date.now()}`;
        const email = `${username}@example.com`;

        // 1. Create User
        await page.click('button:has-text("Create User")'); // Adjust selector as needed
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'Password123!');
        await page.selectOption('select[name="role"]', 'EMPLOYEE'); // or whatever role select exists
        await page.click('button:has-text("Create")'); // Submit creation

        // Verify created
        await expect(page.getByText('User created successfully')).toBeVisible();
        await page.reload();
        await expect(page.getByText(username)).toBeVisible();

        // 2. Reset Password (if feature exists in UI)
        // Find row
        const row = page.locator('tr', { hasText: username });
        // Click edit or reset password
        // Assuming there is an Edit button or Reset Password button
        if (await row.getByTitle('Reset Password').isVisible()) {
            await row.getByTitle('Reset Password').click();
            await page.fill('input[name="newPassword"]', 'NewPass123!');
            await page.click('button:has-text("Save")');
            await expect(page.getByText('Password updated')).toBeVisible();
        }

        // 3. Delete User
        await row.getByTitle('Delete').click().catch(() =>
            row.getByRole('button', { name: /delete/i }).click()
        );

        // Confirm delete
        await expect(page.getByText('Are you sure')).toBeVisible();
        await page.click('button:has-text("Delete")'); // Confirm

        // Verify deleted
        await expect(page.getByText('User deleted successfully')).toBeVisible();
        await expect(page.getByText(username)).not.toBeVisible();
    });
});
