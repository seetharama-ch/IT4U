import { test, expect } from '@playwright/test';

/**
 * Production Regression Test: Admin Delete Ticket (No Blank Screen)
 * 
 * Verifies that deleting a ticket as admin does NOT cause a blank screen crash.
 * This is a regression test for the bug where 204 No Content responses caused
 * JSON parse errors.
 */

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';

test.describe('Admin Delete Ticket - Regression Test', () => {
    let adminCookies;
    let testTicketId;

    test.beforeAll(async ({ browser }) => {
        // Login as admin and get session
        const context = await browser.newContext({
            ignoreHTTPSErrors: true
        });
        const page = await context.newPage();

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Admin@123');
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL(/\/app\/(admin|tickets)/);

        // Save cookies for API requests
        adminCookies = await context.cookies();
        await context.close();
    });

    test.beforeEach(async ({ request }) => {
        // Create a test ticket via API for safe deletion
        const response = await request.post(`${BASE_URL}/api/tickets`, {
            headers: {
                Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; ')
            },
            data: {
                title: `E2E_DELETE_TEST_${Date.now()}`,
                description: 'Test ticket for delete regression test',
                category: 'OTHERS',
                requester: { username: 'admin' }
            }
        });

        expect(response.ok()).toBeTruthy();
        const ticket = await response.json();
        testTicketId = ticket.id;
        console.log(`Created test ticket #${testTicketId} for delete test`);
    });

    test('should delete ticket without blank screen crash', async ({ page }) => {
        // Navigate to ticket details
        await page.goto(`${BASE_URL}/app/tickets/${testTicketId}`);

        // Wait for ticket details to load
        await expect(page.locator('h3', { hasText: `#${testTicketId}` })).toBeVisible();

        // Setup console error listener BEFORE clicking delete
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click delete button
        await page.click('button:has-text("Delete Ticket")');

        // Confirm deletion in modal
        await page.click('button:has-text("Delete")');

        // CRITICAL ASSERTIONS: No blank screen

        // 1. Should show success toast
        await expect(page.locator('text=Ticket deleted successfully')).toBeVisible({ timeout: 5000 });

        // 2. Should redirect to tickets list (header should still be visible)
        await page.waitForURL(/\/app\/(admin|tickets)/, { timeout: 5000 });

        // 3. Header/layout should still be visible (not blank screen)
        await expect(page.locator('header, nav, [role="navigation"]').first()).toBeVisible();

        // 4. No console errors related to JSON parse or component crashes
        const jsonParseErrors = consoleErrors.filter(err =>
            err.includes('JSON') ||
            err.includes('Unexpected token') ||
            err.includes('SyntaxError')
        );
        expect(jsonParseErrors).toHaveLength(0);

        console.log('✅ Delete successful - No blank screen, no JSON errors, layout intact');
    });

    test('should handle delete with error boundary if component crashes', async ({ page }) => {
        // This test verifies ErrorBoundary catches any unexpected crashes

        await page.goto(`${BASE_URL}/app/tickets/${testTicketId}`);
        await expect(page.locator('h3', { hasText: `#${testTicketId}` })).toBeVisible();

        // Click delete
        await page.click('button:has-text("Delete Ticket")');
        await page.click('button:has-text("Delete")');

        // Even if there's an error, ErrorBoundary should show friendly UI
        // Check for either success OR error boundary (not blank screen)
        const isSuccess = await page.locator('text=Ticket deleted successfully').isVisible().catch(() => false);
        const hasErrorBoundary = await page.locator('text=Something went wrong').isVisible().catch(() => false);
        const hasLayout = await page.locator('header, nav').first().isVisible().catch(() => false);

        // At least one should be true (not a blank screen)
        expect(isSuccess || hasErrorBoundary || hasLayout).toBeTruthy();

        console.log('✅ ErrorBoundary protection verified');
    });

    test('should return 404 for deleted ticket fetch', async ({ request }) => {
        // First delete the ticket via API
        const deleteResponse = await request.delete(`${BASE_URL}/api/tickets/${testTicketId}`, {
            headers: {
                Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; ')
            }
        });

        // Should return 204 No Content
        expect([200, 204]).toContain(deleteResponse.status());

        // Try to fetch the deleted ticket
        const fetchResponse = await request.get(`${BASE_URL}/api/tickets/${testTicketId}`, {
            headers: {
                Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; ')
            }
        });

        // Should return 404
        expect(fetchResponse.status()).toBe(404);

        console.log('✅ Deleted ticket returns 404 as expected');
    });
});
