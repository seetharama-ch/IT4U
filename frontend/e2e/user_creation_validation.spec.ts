import { test, expect } from '@playwright/test';

test.describe('User Creation Validation', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('should show validation errors when creating user with empty fields', async ({ page }) => {
        await page.goto('/admin/users');

        // Open Create Modal
        await page.click('button:has-text("+ Add User")');
        await expect(page.locator('.user-modal')).toBeVisible();

        // Bypass HTML5 validation by removing 'required' attributes via JS
        await page.evaluate(() => {
            document.querySelectorAll('input[required]').forEach(el => el.removeAttribute('required'));
        });

        // Submit empty form
        await page.click('button:has-text("Create")');

        // Expect validation errors (Backend 400 maps to field errors)
        // Check for red borders or error text
        // Based on UserList.jsx: setFieldErrors(errorData) maps to <p>{fieldErrors.username}</p>

        // Assert Username error
        await expect(page.locator('p.text-red-500').filter({ hasText: /Username is required/i })).toBeVisible();
        await expect(page.locator('input[name="username"]')).toHaveClass(/border-red-500/);

        // Assert Email error
        await expect(page.locator('p.text-red-500').filter({ hasText: /Email is required/i })).toBeVisible();
    });
});
