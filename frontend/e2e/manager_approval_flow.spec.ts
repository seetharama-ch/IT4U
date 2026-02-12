import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Use pre-seeded users from DataInitializer
const MGR_USER = 'manager_mike';
const EMP_USER = 'employee';
const PASSWORD = 'password';

// Helper: Login
async function login(page: Page, username: string, pass: string) {
    await page.goto('https://gsg-mecm/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', pass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**');
}

test.describe('Manager Approval Flow & Status Consistency', () => {

    test('Manager can approve a ticket and status updates correctly', async ({ page }) => {
        test.slow();
        // 1. Login as Employee
        await login(page, EMP_USER, PASSWORD);

        // 2. Create Ticket
        await page.goto('https://gsg-mecm/app/tickets/new');
        await page.fill('[data-testid="ticket-title"]', 'Manager Approval Test Ticket');
        await page.selectOption('[data-testid="ticket-category"]', 'HARDWARE');
        await page.fill('[data-testid="ticket-description"]', 'Manager Approval Test');

        // Robust Manager Selection
        const mgrSelect = page.locator('[data-testid="ticket-manager"]');
        await expect(mgrSelect).toBeVisible();

        try {
            await mgrSelect.selectOption({ value: 'manager_mike' });
            console.log('Selected manager_mike by value');
        } catch (e) {
            console.log('Value manager_mike not found, trying text/index fallback');
            const options = await mgrSelect.locator('option').allInnerTexts();
            console.log('Manager Options:', options);
            // Try to find "Manager One" (manager_mike) or "manager mike"
            const targetOption = options.find(o =>
                o.includes('Manager One') ||
                o.includes('manager_mike') ||
                o.toLowerCase().includes('manager mike')
            );
            if (targetOption) {
                console.log(`Selecting Manager: ${targetOption}`);
                await mgrSelect.selectOption({ label: targetOption });
            } else {
                console.log('Target manager not found, falling back to index 1');
                await mgrSelect.selectOption({ index: 1 });
            }
        }

        await page.click('[data-testid="ticket-submit"]');
        await expect(page.locator('[data-testid="ticket-success-modal"]')).toBeVisible();

        // Extract ID
        const text = await page.locator('[data-testid="ticket-success-modal"]').innerText();
        const match = text.match(/Ticket Number:\s*(GSG-\d+)/);
        const ticketNo = match ? match[1] : 'UNKNOWN';
        console.log(`Created Ticket: ${ticketNo}`);

        await page.click('[data-testid="ticket-success-ok"]');

        // Logout
        await page.click('button[aria-label="Open user menu"]');
        await page.click('text=Sign out');

        // 3. Login as Manager
        await login(page, MGR_USER, PASSWORD);

        // 4. Find and Open Ticket
        await page.click('text=Pending Approvals');
        await page.waitForTimeout(2000); // Wait for fetch
        await page.reload(); // Force reload to be sure
        await page.waitForTimeout(2000);
        await page.click('text=Pending Approvals'); // Click again after reload

        // Wait for table to load
        await expect(page.locator('table')).toBeVisible();

        // Debug: Print table text
        // console.log('Table Text:', await page.locator('table').innerText());

        // Click View button in the row containing the ticket number
        const ticketRow = page.locator(`tr:has-text("${ticketNo}")`);
        await expect(ticketRow).toBeVisible({ timeout: 10000 });
        await ticketRow.locator('text=View').click();

        // 5. Verify Buttons
        await expect(page.locator('input[value="APPROVED"]')).toBeVisible({ timeout: 15000 });
        await page.click('input[value="APPROVED"]');

        await page.selectOption('select.input-field', 'MEDIUM');

        await page.click('button:has-text("Submit Review")');

        // 6. Verify Success
        await expect(page.locator('text=Ticket Approved')).toBeVisible();
        await page.getByRole('button', { name: 'Return to Dashboard' }).click();

        // 7. Verify Status in List
        await page.click('text=Approved Tickets');
        await expect(page.locator(`tr:has-text("${ticketNo}")`)).toBeVisible();

        // Open details
        await page.click(`text=${ticketNo}`); // Simpler selector works for Approved list usually
        await expect(page.locator('span:has-text("OPEN")').first()).toBeVisible();

        // Logout manager
        await page.click('button[aria-label="Open user menu"]');
        await page.click('text=Sign out');

        // ==== ADMIN TEST PART ====
        // 8. Login as Employee & Create Ticket 2 for Admin Close Test
        await login(page, EMP_USER, PASSWORD);

        await page.goto('https://gsg-mecm/app/tickets/new');
        await page.fill('[data-testid="ticket-title"]', 'Admin Close Test Ticket');
        await page.selectOption('[data-testid="ticket-category"]', 'HARDWARE');
        await page.fill('[data-testid="ticket-description"]', 'Admin Close Test');

        // Robust Manager Selection for Admin Test
        const mgrSelectAdmin = page.locator('[data-testid="ticket-manager"]');
        try {
            await mgrSelectAdmin.selectOption({ value: 'manager_mike' });
        } catch (e) {
            await mgrSelectAdmin.selectOption({ index: 1 });
        }

        await page.click('[data-testid="ticket-submit"]');
        await expect(page.locator('[data-testid="ticket-success-modal"]')).toBeVisible();

        const text2 = await page.locator('[data-testid="ticket-success-modal"]').innerText();
        const ticketNo2 = text2.match(/Ticket Number:\s*(GSG-\d+)/)[1];
        await page.click('[data-testid="ticket-success-ok"]');

        await page.click('button[aria-label="Open user menu"]');
        await page.click('text=Sign out');

        // 9. Login as Admin
        await login(page, 'admin', 'admin123');

        // 10. Open Ticket 2
        await page.fill('input[placeholder*="Search"]', ticketNo2);
        await page.waitForTimeout(1000); // Debounce
        await page.click(`text=${ticketNo2}`);

        // 11. Force Close
        await page.click('button:has-text("Close Ticket")');

        // 12. Verify Status
        await expect(page.locator('span:has-text("CLOSED")').first()).toBeVisible();

        // 13. Verify Approval Status (NA)
        await expect(page.locator('span:has-text("NA")').first()).toBeVisible();

        // 14. Verify Filter
        await page.click('text=Back to Tickets');

        const pendingFilter = page.locator('button:has-text("Pending Approval")');
        if (await pendingFilter.isVisible()) {
            await pendingFilter.click();
            await expect(page.locator(`tr:has-text("${ticketNo2}")`)).not.toBeVisible();
        }
    });

});
