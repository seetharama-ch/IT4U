import { test, expect, Page } from '@playwright/test';

// Use env var or default
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
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

test.describe.serial('Phase 4: Manager Rejection Flow', () => {
    let ticketNumber = '';

    test('1. Employee Creates Ticket for Rejection', async ({ page }) => {
        // Login Employee
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'employee_john');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/app\/employee/);

        // Create Ticket
        await page.goto(`${BASE_URL}/app/tickets/new`);
        await page.fill('[data-testid="ticket-title"]', `Rejection Test ${TIMESTAMP}`);
        await page.selectOption('[data-testid="ticket-category"]', 'SOFTWARE');
        await page.fill('[data-testid="ticket-description"]', "This ticket should be rejected.");

        // Select manager Mike if available
        const mgrSelect = page.locator('[data-testid="ticket-manager"]');
        if (await mgrSelect.count() > 0) {
            // Try to select manager_mike by label if possible, or just index 1
            await mgrSelect.selectOption({ index: 1 });
        }
        await page.click('[data-testid="ticket-submit"]');

        // Capture Ticket Number
        await page.waitForSelector('[data-testid="ticket-success-modal"]');
        const modalText = await page.locator('[data-testid="ticket-success-modal"]').textContent();
        const match = modalText?.match(/Ticket Number:\s*([\w-]+)/);
        if (match) ticketNumber = match[1];
        expect(ticketNumber).toBeTruthy();
        console.log(`Created ticket for rejection: ${ticketNumber}`);

        await page.click('[data-testid="ticket-success-ok"]');
        await logout(page);
    });

    test('2. Manager Rejects Ticket', async ({ page }) => {
        expect(ticketNumber).toBeTruthy();
        // Login Manager
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'manager_mike');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Find Ticket
        const ticketRow = page.locator(`tr:has-text("${ticketNumber}")`).first();
        await expect(ticketRow).toBeVisible();

        // Reject
        // Assuming there is a "Reject" button in the row or details
        // Check for Reject button in row first
        const rejectBtn = ticketRow.locator('button:has-text("Reject")');
        if (await rejectBtn.isVisible()) {
            await rejectBtn.click();
        } else {
            // Click to details
            await ticketRow.click();
            await page.click('button:has-text("Reject")');
        }

        // Verify Rejection Dialog/Comment requirement if any
        // Scenario says "Reject ticket (with comment)"
        // If a prompt appears, handle it.
        const commentBox = page.locator('textarea, input[placeholder*="reason"], input[placeholder*="comment"]');
        if (await commentBox.isVisible()) {
            await commentBox.fill('Rejection Reason: Invalid Request');
            await page.click('button:has-text("Confirm"), button:has-text("Submit Rejection")');
        }

        // Verify status change in list or details
        // Wait for update
        await page.waitForTimeout(1000);
        await expect(page.locator('text=REJECTED')).toBeVisible();

        await logout(page);
    });

    test('3. Employee Verifies Rejection', async ({ page }) => {
        expect(ticketNumber).toBeTruthy();
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'employee_john');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        const ticketRow = page.locator(`tr:has-text("${ticketNumber}")`).first();
        await expect(ticketRow).toBeVisible();
        await expect(ticketRow).toContainText('REJECTED');

        // Check comments?
        await ticketRow.click();
        await expect(page.locator('text=Rejection Reason: Invalid Request')).toBeVisible();

        await logout(page);
    });
});
