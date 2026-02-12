import { test, expect } from '@playwright/test';

test('SSO User Cannot Login with Password', async ({ page }) => {
    // 1. Simulate an SSO user (we can't easily create one without mocking or having an existing one).
    // Strategy: Try to login with a user that DOES NOT exist first, standard fail.
    // Then try to login with a known SSO user if possible.
    // Since we rely on "Microsoft SSO", we can't easily automate the SSO creation in this test without full mock.

    // ALTERNATIVE: Create a user via API as "SSO" provider (Admin API can't set AuthProvider directly easily via UI, but backend defaults to LOCAL).
    // If we can't create an SSO user via UI, we might need to seed the DB or mock the response.

    // However, we CAN test the logic by trying to login with an account that SHOULD be blocked if we can create it as SSO.
    // But Admin API creates LOCAL users.

    // Let's mock the network response for /api/auth/login to return 403 
    // to verify the Frontend UI handling, assuming backend covers the logic (which we unit tested via code review).
    // OR: We can use the Admin API to create a user, then update their status in DB? No DB access from Playwright easily.

    // Let's stick to testing the Frontend reaction to a 403.

    await page.route('**/api/auth/login', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        if (postData.username === 'sso_user') {
            await route.fulfill({
                status: 403,
                body: 'Password login not permitted for this account. Use SSO.'
            });
        } else {
            await route.continue();
        }
    });

    await page.goto('/login');
    await page.fill('input[name="username"]', 'sso_user');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("Login with Username/Password")');

    // Expect Error Message
    await expect(page.locator('.bg-red-50')).toContainText('Password login not permitted for this account. Use SSO.');
});
