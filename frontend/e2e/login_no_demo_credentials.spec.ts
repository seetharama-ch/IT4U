import { test, expect } from '@playwright/test';

/**
 * Production Test: Login Page - No Demo Credentials
 * 
 * Verifies that the login page does NOT display any demo credentials
 * in production builds.
 */

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';

test.describe('Login Page - No Demo Credentials', () => {
    test('should NOT display any demo credentials text', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Get full page text content
        const pageText = await page.textContent('body');

        // List of forbidden demo credential strings
        const forbiddenStrings = [
            'demo',
            'Demo',
            'DEMO',
            'Admin@123',
            'employee_john',
            'Password@123',
            'Try these',
            'Sample login',
            'Test credentials',
            'demo credentials',
            'sample credentials',
            'for testing'
        ];

        const foundForbidden = [];
        for (const str of forbiddenStrings) {
            if (pageText.includes(str)) {
                foundForbidden.push(str);
            }
        }

        // Assert NO forbidden strings found
        expect(foundForbidden).toHaveLength(0);

        if (foundForbidden.length > 0) {
            console.error(`❌ Found forbidden demo credential strings: ${foundForbidden.join(', ')}`);
        } else {
            console.log('✅ No demo credentials found on login page');
        }
    });

    test('should NOT have demo credential fields or hints', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Check for any input fields with demo values
        const usernameField = page.locator('input[name="username"]');
        const passwordField = page.locator('input[name="password"]');

        // Fields should NOT have demo values pre-filled
        const usernameValue = await usernameField.inputValue();
        const passwordValue = await passwordField.inputValue();

        expect(usernameValue).not.toContain('employee');
        expect(usernameValue).not.toContain('demo');
        expect(passwordValue).toBe('');

        // Check for placeholder text (should be generic, not demo credentials)
        const usernamePlaceholder = await usernameField.getAttribute('placeholder');
        const passwordPlaceholder = await passwordField.getAttribute('placeholder');

        if (usernamePlaceholder) {
            expect(usernamePlaceholder.toLowerCase()).not.toContain('employee_john');
            expect(usernamePlaceholder.toLowerCase()).not.toContain('demo');
        }

        if (passwordPlaceholder) {
            expect(passwordPlaceholder).not.toContain('Admin@123');
            expect(passwordPlaceholder).not.toContain('Password@123');
        }

        console.log('✅ No demo credentials in input fields or placeholders');
    });

    test('should only show SSO and local login options (no demo banner)', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Should have standard login elements
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Should NOT have any "demo mode" or "test mode" banners
        const demoBanner = page.locator('text=/demo mode|test mode|development mode/i');
        expect(await demoBanner.count()).toBe(0);

        console.log('✅ Login page is production-ready (no demo banners)');
    });
});
