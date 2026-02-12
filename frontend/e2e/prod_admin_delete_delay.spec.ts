import { test, expect } from '@playwright/test';
import { loginProd } from './utils/auth.prod';

test.describe('Admin Ticket Delete (PROD Delayed Verification)', () => {

    test('should delete existing ticket with confirmation and no crash', async ({ page }) => {
        // Monitor Console
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // 1. Login
        await loginProd(page, process.env.ADMIN_USER ?? 'admin', process.env.ADMIN_PASS ?? 'admin123');
        console.log('Logged in as Admin');

        // Add requested delay
        await page.waitForTimeout(2000);

        // 2. Navigate to Admin Dashboard (Pending Approval tab default)
        // Ensure we are on the dashboard
        await expect(page.locator('h1')).toContainText('Admin Dashboard');

        // Switch to "Pending Approval" tab explicitly to ensure we see the list
        await page.click('button:has-text("Pending Approval")');
        await page.waitForTimeout(1000);

        // 3. Find ANY Ticket
        console.log('Searching for any available ticket...');

        // Wait for table to load
        await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => console.log('No rows found initially'));

        const rows = page.locator('tbody tr');
        const count = await rows.count();
        console.log(`Found ${count} tickets in the list.`);

        if (count === 0) {
            throw new Error('No tickets found in "Pending Approval". Cannot verify delete crash.');
        }

        // Get the first ticket's ID for logging
        const firstRow = rows.first();
        const ticketText = await firstRow.innerText();
        // Extract GSG- ID if possible, or just log part of text
        const match = ticketText.match(/(GSG-\d+)/);
        const targetTicket = match ? match[1] : 'Unknown Ticket';
        console.log(`Targeting ticket: ${targetTicket}`);

        // 4. Click Delete on first row
        console.log(`Deleting ticket ${targetTicket}`);
        const deleteBtn = firstRow.locator('button:has-text("Delete")');

        // Ensure button is there
        if (await deleteBtn.count() === 0) {
            throw new Error(`First row (${targetTicket}) does not have a Delete button.`);
        }

        await deleteBtn.click({ force: true });

        await page.waitForTimeout(1000); // Wait for modal animation

        // 5. Verify Modal
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Are you sure');
        await expect(modal).toContainText('delete');
        console.log('Confirmation modal verified');

        await page.waitForTimeout(1000); // Delay for user visibility

        // 6. Confirm Delete
        const confirmBtn = modal.locator('button:has-text("Delete")'); // The red button inside modal
        console.log('Clicking delete in modal and waiting for response...');

        try {
            const [resp] = await Promise.all([
                page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('/api/'), { timeout: 30000 }),
                confirmBtn.click({ force: true }),
            ]);
            console.log('DELETE RESPONSE:', resp.status(), resp.url());
        } catch (e) {
            console.log('DELETE REQUEST FAILED OR TIMED OUT');
            throw e;
        }

        console.log('Confirmed delete');

        // 7. Verification Steps
        await page.waitForTimeout(2000); // Wait for server refetch and UI update

        // Check 1: Modal gone
        await expect(modal).toBeHidden();

        // Check 2: Row gone
        await expect(page.locator(`tr:has-text("${targetTicket}")`)).toBeHidden();
        console.log('Row removed from list');

        // Check 3: Page NOT blank (header still exists)
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('h1')).toContainText('Admin Dashboard');
        console.log('Page is healthy (no blank screen)');

        // Optional: Check toast
        // await expect(page.locator('.go3958317564')).toContainText('successfully'); 
    });
});
