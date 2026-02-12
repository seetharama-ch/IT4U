import { test, expect } from '@playwright/test';

test('Debug Prod Connectivity', async ({ page }) => {
    console.log('Starting Debug Test...');
    try {
        await page.goto('https://gsg-mecm/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Navigated to Login');
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        await page.screenshot({ path: 'debug_login.png' });
        console.log('Screenshot taken');
    } catch (e) {
        console.error('Navigation Failed:', e);
        throw e;
    }
});
