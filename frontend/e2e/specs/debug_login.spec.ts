import { test, expect } from '@playwright/test';

test('debug raw login', async ({ page }) => {
    console.log('Navigating to login...');
    console.log('Page URL before:', page.url());
    // Use the full URL as sanity test did, to be safe
    await page.goto('https://gsg-mecm/login');
    console.log('Page URL after goto:', page.url());

    console.log('Filling credentials...');
    // Log content if fill fails (simulated by try-catch if needed, but let's try raw first)
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation...');
    await page.waitForURL('**/app/admin');

    console.log('Login successful!');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
});
