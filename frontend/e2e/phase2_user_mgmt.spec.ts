import { test, expect, Page } from '@playwright/test';

// Use env var or default
const BASE_URL = process.env.BASE_URL || 'http://localhost:8060';
const TIMESTAMP = Date.now().toString();

// Reuse robust logout
async function logout(page: Page): Promise<void> {
    const menuBtn = page.locator('button[aria-label*="user" i], button[aria-label*="menu" i], button:has-text("Open user menu"), header button').first();
    if (await menuBtn.isVisible()) {
        await menuBtn.click({ timeout: 5000 });
    }
    const signOut = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [role="menuitem"]:has-text("Sign out"), [role="menuitem"]:has-text("Logout")').first();
    if (await signOut.isVisible()) {
        await signOut.click({ timeout: 5000 });
    } else {
        await menuBtn.click();
        await signOut.click();
    }
    await page.waitForURL(/\/login/i, { timeout: 15000 });
}

async function createIfNeeded(page: Page, role: string, username: string) {
    // Navigate to users
    await page.goto(`${BASE_URL}/app/admin/users`);
    await page.waitForTimeout(1000); // stable

    // Check existence
    const row = page.locator(`tr:has-text("${username}")`).first();
    if (await row.isVisible()) {
        console.log(`User ${username} already exists.`);
        return;
    }

    console.log(`Creating user ${username}...`);
    // Click Add User
    await page.click('button:has-text("Add User"), button:has-text("Create New User")');
    await page.waitForSelector('input[name="username"]');

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', 'password');
    await page.fill('input[name="email"]', `${username}@test.com`);

    // Role Select
    // assuming select name="role"
    await page.selectOption('select[name="role"]', role);

    // Other fields might be required based on previous tests
    if (await page.locator('input[name="phoneNumber"]').isVisible()) {
        await page.fill('input[name="phoneNumber"]', '1234567890');
    }
    if (await page.locator('input[name="department"]').isVisible()) {
        await page.fill('input[name="department"]', 'QA');
    }
    if (await page.locator('input[name="jobTitle"]').isVisible()) {
        await page.fill('input[name="jobTitle"]', 'Tester');
    }

    await page.click('button:has-text("Create")');

    // Wait for modal close or list update
    await page.waitForSelector(`tr:has-text("${username}")`, { timeout: 20000 });
    console.log(`User ${username} created.`);
}

test.describe.serial('Phase 2: Admin User Management', () => {
    test.setTimeout(120000); // 2 minutes

    const users = [
        { role: 'EMPLOYEE', username: 'phase2_emp', expectedUrl: '/app/employee' },
        { role: 'MANAGER', username: 'phase2_mgr', expectedUrl: '/app/manager' },
        { role: 'IT_SUPPORT', username: 'phase2_sup', expectedUrl: '/app/it-support' }
    ];

    test('1. Admin Creates Users', async ({ page }) => {
        // Login Admin
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Admin@123'); // PROD
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/app\/admin/);

        for (const u of users) {
            await createIfNeeded(page, u.role, u.username);
        }

        await logout(page);
    });

    for (const u of users) {
        test(`2. Login as created user ${u.username}`, async ({ page }) => {
            await page.goto(`${BASE_URL}/login`);
            if (!page.url().includes('login')) await logout(page);

            await page.fill('input[name="username"]', u.username);
            await page.fill('input[name="password"]', 'password');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(new RegExp(u.expectedUrl));
            console.log(`Login successful for ${u.username}`);

            // Optional: Check /api/auth/me
            const me = await page.request.get('/api/auth/me');
            expect(me.status()).toBe(200);

            await logout(page);
        });
    }
});
