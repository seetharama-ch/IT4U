import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('authenticate and save state', async ({ page }) => {
    // 1. Navigate to Azure SSO Login
    console.log('Navigating to SSO Login...');
    await page.goto('http://localhost:8081/oauth2/authorization/azure');

    // 2. Wait for manual login interaction
    console.log('Please sign in manually in the browser window...');

    // Wait until we are redirected back to the app (e.g., base URL or dashboard)
    // Using a timeout of 0 to allow unlimited time for manual interaction
    await page.waitForURL('http://localhost:8081/**', { timeout: 0 });

    // 3. Verify we are back
    await expect(page).toHaveTitle(/IT4U|GSG/i);

    // 4. Save state
    const authDir = path.resolve('e2e/auth-setup');
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const statePath = path.join(authDir, 'storageState.json');
    await page.context().storageState({ path: statePath });
    console.log(`Storage state saved to ${statePath}`);
});
