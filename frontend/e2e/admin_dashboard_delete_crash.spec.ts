import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';

test.describe('Admin Dashboard Delete Crash Reproduction', () => {
    let adminCookies;
    let testTicketId;
    let testTicketNumber;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Admin@123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/app\/admin/);

        adminCookies = await context.cookies();
        await context.close();
    });

    test.beforeEach(async ({ request }) => {
        // Create ticket
        const response = await request.post(`${BASE_URL}/api/tickets`, {
            headers: { Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; ') },
            data: {
                title: `DASH_DELETE_TEST_${Date.now()}`,
                description: 'Testing dashboard delete crash',
                category: 'OTHERS',
                priority: 'LOW',
                requester: { username: 'admin' }
            }
        });
        expect(response.ok()).toBeTruthy();
        const ticket = await response.json();
        testTicketId = ticket.id;
        testTicketNumber = ticket.ticketNumber;
        console.log(`Created ticket ${testTicketNumber} (${testTicketId})`);
    });

    test('should delete ticket from dashboard list without crashing', async ({ page }) => {
        // Go to dashboard
        await page.goto(`${BASE_URL}/app/admin`);

        // Ensure ticket is visible (might need search if list is long)
        // Try searching for it to isolate
        await page.fill('input[placeholder="e.g. GSG..."]', testTicketNumber || String(testTicketId));
        await page.click('button:has-text("Apply")');

        // Locate the row
        const row = page.locator('tr', { hasText: testTicketNumber || String(testTicketId) });
        await expect(row).toBeVisible();

        // Click Delete on the row
        await row.locator('button:has-text("Delete")').click();

        // Expect Confirm Modal
        const modal = page.locator('[data-testid="delete-confirm-dialog"]');
        await expect(modal).toBeVisible();

        // Click Confirm Delete
        await modal.locator('button:has-text("Delete")').click();

        // CRITICAL CHECK: No blank screen
        // 1. Modal should disappear
        await expect(modal).toBeHidden();

        // 2. Row should disappear
        await expect(row).toBeHidden();

        // 3. Dashboard header should STILL be visible (proof of no crash)
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible();

        // 4. Console check
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        // Wait a bit to ensure no late crash
        await page.waitForTimeout(2000);

        expect(errors.filter(e => e.includes('JSON') || e.includes('Unexpected token'))).toHaveLength(0);
    });
});
