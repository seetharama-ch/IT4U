import { Page, expect } from "@playwright/test";

import * as fs from 'fs';

export async function login(page: Page, username: string, password: string) {
    page.on("dialog", async (d) => await d.accept());
    page.on("console", msg => console.log(`[Browser Console] ${msg.text()}`));
    page.on("pageerror", err => console.log(`[Browser Error] ${err}`));

    console.log(`[Auth] Navigating to /login`);
    try {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
        console.log(`[Auth] Navigation to /login complete. Current URL: ${page.url()}`);
    } catch (e) {
        console.error(`[Auth] Navigation failed: ${e}`);
        throw e;
    }

    console.log(`[Auth] Waiting for username input...`);
    try {
        await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 15000 });
        console.log(`[Auth] Username input found.`);
    } catch (e) {
        console.error(`[Auth] Username input NOT found: ${e}`);
        await page.screenshot({ path: "auth-wait-fail.png" });
        const content = await page.content();
        fs.writeFileSync('auth-wait-fail.html', content);
        throw e;
    }

    console.log(`[Auth] Filling credentials for ${username}`);

    // DEBUG: Screenshot and HTML before fill
    await page.screenshot({ path: "auth-debug-before-fill.png" });
    const content = await page.content();
    fs.writeFileSync('auth-debug.html', content);

    try {
        console.log(`[Auth] Filling username/password using simple_login selectors...`);

        console.log(`[Auth] Checking username input count: ${await page.locator('input[name="username"]').count()}`);
        console.log(`[Auth] Checking password input count: ${await page.locator('input[name="password"]').count()}`);

        // Using selectors from simple_login.spec.ts which are known to work
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
    } catch (e) {
        console.error(`[Auth] Error filling credentials: ${e}`);
        await page.screenshot({ path: "auth-error.png" });
        throw e;
    }

    console.log(`[Auth] Clicking login`);
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }),
        page.click('button[type="submit"]'), // Updated selector
    ]);

    console.log(`[Auth] Login clicked, checking header`);
    // Header should exist after login (prevents silent logout)
    await expect(page.locator("header")).toBeVisible();
    console.log(`[Auth] Login successful`);
}
