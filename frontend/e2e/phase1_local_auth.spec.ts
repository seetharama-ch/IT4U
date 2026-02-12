import { test, expect, Page } from '@playwright/test';

test.describe.serial('Phase 1A: Local Login (CRITICAL)', () => {

    // Robust logout function from manual_full_flow
    async function logout(page: Page): Promise<void> {
        // Open user menu (robust selector strategy)
        const menuBtn = page.locator(
            'button[aria-label*="user" i], button[aria-label*="menu" i], button:has-text("Open user menu"), header button'
        ).first();

        // If menu button exists, click it. If 'Logout' is already visible (e.g. sidebar), skip.
        if (await menuBtn.isVisible()) {
            await menuBtn.click({ timeout: 5000 });
        }

        // Wait for menu or find logout directly
        // Some UIs have logout directly in navbar
        const signOut = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [role="menuitem"]:has-text("Sign out"), [role="menuitem"]:has-text("Logout")').first();

        if (await signOut.isVisible()) {
            await signOut.click({ timeout: 5000 });
        } else {
            // Retry menu click if needed
            await menuBtn.click();
            await signOut.click();
        }

        // Wait for login page
        await page.waitForURL(/\/login/i, { timeout: 15000 });
    }

    const users = [
        { role: 'Admin', username: 'admin', password: 'Admin@123', expectedUrl: '/app/admin', expectedRole: 'ADMIN' },
        { role: 'Manager', username: 'manager_mike', password: 'password', expectedUrl: '/app/manager', expectedRole: 'MANAGER' },
        { role: 'Employee', username: 'employee_john', password: 'password', expectedUrl: '/app/employee', expectedRole: 'EMPLOYEE' },
        { role: 'IT Support', username: 'it_support_jane', password: 'password', expectedUrl: '/app/it-support', expectedRole: 'IT_SUPPORT' }
    ];

    for (const user of users) {
        test(`Login as ${user.role} (${user.username})`, async ({ page }) => {
            console.log(`[${user.role}] Starting login test...`);

            // Go to login
            await page.goto('/login');

            // Check if already logged in, if so logout
            if (!page.url().includes('/login')) {
                await logout(page);
            }

            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="password"]', user.password);
            await page.click('button[type="submit"]');

            // Verify Dashboard Load
            await expect(page).toHaveURL(new RegExp(user.expectedUrl), { timeout: 10000 });
            console.log(`[${user.role}] Dashboard loaded: ${page.url()}`);

            // Verify /api/auth/me
            const response = await page.request.get('/api/auth/me');
            expect(response.status()).toBe(200);
            const body = await response.json();

            // Normalize roles if needed (e.g. ROLE_ADMIN vs ADMIN)
            const returnedRole = body.role.replace('ROLE_', '');
            expect(returnedRole).toBe(user.expectedRole);
            expect(body.username).toBe(user.username);

            console.log(`[${user.role}] /api/auth/me verified. Role: ${returnedRole}`);

            // Logout
            await logout(page);
            console.log(`[${user.role}] Logout successful.`);
        });
    }
});
