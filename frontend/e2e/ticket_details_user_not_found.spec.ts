import { test, expect } from '@playwright/test';

/**
 * E2E Test: Ticket Details - User Not Found Regression
 * 
 * Purpose: Ensure GET /api/tickets/{id} returns 200 and renders ticket details
 * even when related users are missing/deleted.
 * 
 * This test prevents regression of the PROD crash where missing user references
 * caused 500 "User not found" errors.
 */

test.describe('Ticket Details - User Not Found Regression', () => {

    test('IT Support can open ticket details without 500 error', async ({ page }) => {
        // Navigate to login page
        await page.goto('/');

        // Login as IT Support
        await page.fill('input[name="username"]', 'support');
        await page.fill('input[name="password"]', 'support123');
        await page.click('button[type="submit"]');

        // Wait for navigation to IT Support dashboard
        await page.waitForURL('**/app/it-support');

        // Wait for tickets to load
        await page.waitForSelector('[data-testid="ticket-row"], .ticket-item, table tbody tr', { timeout: 10000 });

        // Click first ticket to open details
        const firstTicket = page.locator('[data-testid="ticket-row"], .ticket-item, table tbody tr').first();
        await firstTicket.click();

        // Wait for ticket details to load (check for common detail elements)
        await page.waitForSelector('text=/Ticket.*#|ID:|Status:|Description:/i', { timeout: 10000 });

        // Verify no error message is shown
        const errorMessage = page.locator('text=/failed to load|error|500|user not found/i');
        await expect(errorMessage).toHaveCount(0, { timeout: 5000 });

        // Verify ticket details are visible
        const ticketDetailsVisible = await page.locator('h1, h2, h3, .ticket-title, [data-testid="ticket-title"]').count() > 0;
        expect(ticketDetailsVisible).toBeTruthy();

        console.log('✓ Ticket details loaded successfully without 500 error');
    });

    test('Ticket details API returns 200 (not 500)', async ({ page }) => {
        let apiResponseStatus = 0;

        // Listen for API response
        page.on('response', async (response) => {
            if (response.url().includes('/api/tickets/') && !response.url().includes('/api/tickets?')) {
                apiResponseStatus = response.status();
                console.log(`API Response: ${response.url()} - Status: ${apiResponseStatus}`);
            }
        });

        // Navigate to login page
        await page.goto('/');

        // Login as IT Support
        await page.fill('input[name="username"]', 'support');
        await page.fill('input[name="password"]', 'support123');
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL('**/app/it-support');
        await page.waitForSelector('[data-testid="ticket-row"], .ticket-item, table tbody tr', { timeout: 10000 });

        // Click first ticket
        const firstTicket = page.locator('[data-testid="ticket-row"], .ticket-item, table tbody tr').first();
        await firstTicket.click();

        // Wait for API call to complete
        await page.waitForTimeout(2000);

        // Verify API returned 200, not 500
        expect(apiResponseStatus).toBe(200);
        console.log('✓ Ticket details API returned 200 OK');
    });
});
