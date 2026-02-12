import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

(async () => {
    // Launch browser in headed mode to allow manual interaction
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to SSO Login...');
    await page.goto('http://localhost:8081/oauth2/authorization/azure');

    // 2. Wait for manual login interaction
    // We expect the user to perform MFA/login in the browser window
    // Increase timeout significantly to allow manual interaction
    await page.waitForURL('http://localhost:8081/**', { timeout: 0 }); // Wait indefinitely or long timeout

    console.log('Login detected. Saving storage state...');

    // Ensure directory exists
    const authDir = path.resolve('e2e/auth-setup');
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    await context.storageState({ path: path.join(authDir, 'storageState.json') });
    console.log(`Storage state saved to ${path.join(authDir, 'storageState.json')}`);

    await browser.close();
})();
