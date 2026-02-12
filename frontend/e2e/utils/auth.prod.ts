import { Page, expect } from '@playwright/test';

export async function loginProd(page: Page, username: string, password: string) {
    console.log(`[ProdAuth] Attempting login for user: ${username}`);

    // Always start from login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for React root + hydration buffer (networkidle can hang sometimes)
    try {
        await page.waitForSelector('#root', { timeout: 30000 });
        await page.waitForTimeout(1500);

        // Check URL for redirect (SSO check)
        if (page.url().includes('login.microsoftonline.com')) {
            throw new Error('Redirected to Microsoft SSO. This test requires local IT4U login page.');
        }

        // Wait for any input to appear (SPA rendered)
        await page.waitForSelector('input', { state: 'visible', timeout: 60000 });

        // Robust selector for user field (email/text/placeholder/name)
        // Using .first() to grab the first matching input which is usually username in standard forms
        const user = page.locator(
            'input[type="email"], input[type="text"], input[name="username"], input[name="email"], input[placeholder*="Email" i], input[placeholder*="User" i]'
        ).first();

        await expect(user).toBeVisible({ timeout: 60000 });
        await user.fill(username);

        const pass = page.locator('input[type="password"]').first();
        await expect(pass).toBeVisible({ timeout: 60000 });
        await pass.fill(password);

        // Click login button
        await page.getByRole('button', { name: /login|sign in/i }).click();

        // Post-login check: wait until URL changes away from /login OR dashboard visible
        await page.waitForTimeout(1000);

        // Safe assertion: you can change this to a dashboard element if you have a stable one
        await expect(page).not.toHaveURL(/\/login/i, { timeout: 60000 });

        console.log('[ProdAuth] Login successful (URL changed)');
    } catch (error) {
        console.error('[ProdAuth] Login failed or timed out:', error);
        // Capture state for debugging
        await page.screenshot({ path: `test-results/login-failed-${Date.now()}.png`, fullPage: true });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync(`test-results/login-failed-${Date.now()}.html`, html);
        throw error;
    }
}
