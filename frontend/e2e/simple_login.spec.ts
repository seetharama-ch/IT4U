import { test, expect } from '@playwright/test';

test('Simple Admin Login', async ({ page }) => {
    console.log('Navigating to login...');
    await page.goto('https://gsg-mecm/login');

    console.log('Filling credentials...');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation...');
    await page.waitForURL('**/app/admin');

    console.log('Login successful!');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
});
