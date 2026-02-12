import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8060';

async function logout(page: Page) {
    const menuBtn = page.locator('button[aria-label*="user" i], button[aria-label*="menu" i], header button').first();
    if (await menuBtn.isVisible()) await menuBtn.click();

    // Try explicit logout or menu item
    const signOut = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [role="menuitem"]:has-text("Sign out")').first();
    if (await signOut.isVisible()) {
        await signOut.click();
    } else {
        await menuBtn.click();
        await signOut.click();
    }
    await page.waitForURL(/\/login/i);
}

test.describe.serial('Phase 3-5: Ticket Lifecycle', () => {
    test.setTimeout(120000);

    let ticketId = '';
    const uniqueTitle = `Phase3 Test ${Date.now()}`;

    test('1. Employee Creates Ticket', async ({ page }) => {
        // Login Employee
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'phase2_emp');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/app\/employee/);

        // Goto New Ticket
        await page.goto(`${BASE_URL}/app/tickets/new`);

        // Fill
        await page.fill('[data-testid="ticket-title"]', uniqueTitle);
        await page.selectOption('[data-testid="ticket-category"]', 'HARDWARE');
        await page.fill('[data-testid="ticket-description"]', 'Testing full lifecycle');

        // Select Manager
        const mgrSelect = page.locator('[data-testid="ticket-manager"]');
        await expect(mgrSelect).toBeVisible();

        // Click Fetch Managers if available
        const fetchMgrBtn = page.locator('button:has-text("Fetch Managers")');
        if (await fetchMgrBtn.isVisible()) {
            await fetchMgrBtn.click();
            await page.waitForTimeout(1000); // Wait for fetch
        }

        // Wait for options
        await expect(mgrSelect.locator('option')).toHaveCount(2); // Default + 1 manager or multiple
        // Or just wait for option > 1

        await mgrSelect.selectOption({ index: 1 }); // Select first available

        await page.click('[data-testid="ticket-submit"]');

        // Success Modal
        await expect(page.locator('[data-testid="ticket-success-modal"]')).toBeVisible({ timeout: 10000 });
        const text = await page.locator('[data-testid="ticket-success-modal"]').textContent();
        const match = text?.match(/Ticket Number:\s*([\w-]+)/);
        if (match) {
            ticketId = match[1];
            console.log(`Ticket Created: ${ticketId}`);
        }
        expect(ticketId).toBeTruthy();

        await page.click('[data-testid="ticket-success-ok"]');
        await logout(page);
    });

    test('2. Manager Approves Ticket', async ({ page }) => {
        expect(ticketId).toBeTruthy();
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'phase2_mgr');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Find Ticket
        const row = page.locator(`tr:has-text("${ticketId}")`).first();
        await expect(row).toBeVisible();
        await row.click(); // Go to details to be safe

        // Approve
        await page.click('button:has-text("Approve")');

        // Verify Approved status
        await expect(page.locator('text=APPROVED')).toBeVisible();

        await logout(page);
    });

    test('3. IT Support Resolves Ticket', async ({ page }) => {
        expect(ticketId).toBeTruthy();
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'phase2_sup');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Find Ticket
        const row = page.locator(`tr:has-text("${ticketId}")`).first();
        await expect(row).toBeVisible();
        await row.click();

        // Assign to me
        const assignBtn = page.locator('button:has-text("Assign to Me")');
        if (await assignBtn.isVisible()) await assignBtn.click();

        // Change Status to IN_PROGRESS
        await page.selectOption('select[name="status"]', 'IN_PROGRESS');
        await page.waitForTimeout(500);

        // Add Comment
        await page.fill('textarea[placeholder*="comment"]', 'Working on it...');
        await page.click('button:has-text("Comment"), button:has-text("Post")');

        // Change Status to RESOLVED
        await page.selectOption('select[name="status"]', 'RESOLVED');
        await expect(page.locator('text=RESOLVED')).toBeVisible();

        await logout(page);
    });

    test('4. Employee Verifies Resolution', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'phase2_emp');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        const row = page.locator(`tr:has-text("${ticketId}")`).first();
        await expect(row).toBeVisible();
        await expect(row).toContainText('RESOLVED');

        await logout(page);
    });
});
