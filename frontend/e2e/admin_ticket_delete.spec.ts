import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin Ticket Delete Regression Test
 * 
 * STABLE VERSION using:
 * - UI ticket creation with proper waits (simple and reliable)
 * - Explicit filter selection to "Approved/Other" (never assume default)
 * - Network response waits (no brittle timeouts)
 * - Stable data-testid selectors
 */

test.describe('Admin Ticket Delete Flow', () => {
    // Phase A: Capture ticket metadata
    let createdTicketId: number | null = null;
    let createdTicketNo: string | null = null;
    let createdAt: string | null = null;

    test.beforeEach(async ({ page }) => {
        // Phase A: Request/Response logging for /api/tickets GET
        page.on('request', (req) => {
            if (req.url().includes('/api/tickets') && req.method() === 'GET') {
                const url = new URL(req.url());
                console.log('>> TICKETS GET:', req.url());
                console.log('   Query Params:', {
                    page: url.searchParams.get('page'),
                    size: url.searchParams.get('size'),
                    sort: url.searchParams.get('sort'),
                });
            }
        });

        page.on('response', async (res) => {
            if (res.url().includes('/api/tickets') && res.request().method() === 'GET') {
                console.log('<< TICKETS RES:', res.status(), res.url());
                try {
                    const body = await res.json();
                    console.log('   totalElements:', body?.totalElements ?? body?.total ?? 'n/a');
                    // Print ticket IDs to confirm what UI is getting
                    const items = body?.content ?? body?.items ?? body ?? [];
                    console.log('   firstIds:', items.slice(0, 5).map((t: any) => t.id));
                    console.log('   Total tickets in response:', Array.isArray(items) ? items.length : 'not an array');
                    if (createdTicketId) {
                        const foundCreated = items.find((t: any) => t.id === createdTicketId);
                        console.log(`   Created ticket ${createdTicketId} in response:`, foundCreated ? 'YES' : 'NO');
                    }
                } catch (e) {
                    console.log('   (non-json response)');
                }
            }
        });

        // Monitor for uncaught page errors
        page.on('pageerror', (error) => {
            throw new Error(`Uncaught page error: ${error.message}`);
        });

        // Login as Admin via UI
        await loginAsAdmin(page);

        // Create test ticket via UI (simpler than API with auth)
        await page.goto('/app/tickets/new');

        // Fill ticket form
        await page.fill('input[name="title"]', 'E2E Delete Test ' + Date.now());
        await page.fill('textarea[name="description"]', 'Test ticket for deletion');
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.fill('input[name="deviceDetails"]', 'TEST-DEV-' + Date.now());

        // Wait for ticket creation response
        const createResponse = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') &&
            resp.request().method() === 'POST' &&
            resp.status() === 201
        );

        await page.click('button[type="submit"]');

        // Phase A: Capture ticket metadata
        const resp = await createResponse;
        const body = await resp.json();
        createdTicketId = body?.id || null;
        createdTicketNo = body?.ticketNumber || null;
        createdAt = body?.createdAt || null;

        console.log('='.repeat(60));
        console.log('PHASE A: Created ticket metadata:');
        console.log('  ticketId:', createdTicketId);
        console.log('  ticketNo:', createdTicketNo);
        console.log('  createdAt:', createdAt);
        console.log('  managerApprovalStatus:', body?.managerApprovalStatus || 'N/A');
        console.log('='.repeat(60));

        // Navigate to admin dashboard
        await page.goto('/app/admin');

        console.log('PHASE A: About to click admin-filter-approved...');

        // Phase A: Explicitly wait for the list request tied to filter click
        const listResp = page.waitForResponse(r =>
            r.url().includes('/api/tickets') &&
            r.request().method() === 'GET' &&
            r.status() === 200
        );

        // **CRITICAL: Explicitly set filter to "Approved/Other"**
        // Admin-created tickets have managerApprovalStatus='NA', so they appear under "Approved/Other", not "Pending Approval"
        await page.getByTestId('admin-filter-approved').click();

        console.log('PHASE A: Waiting for list response after filter click...');
        await listResp;
        console.log('PHASE A: List response received.');

        // Phase A: Poll for ticket rows instead of hard timeout
        console.log('PHASE A: Checking for ticket rows visibility...');
        const rows = page.getByTestId('ticket-row');
        try {
            await expect.poll(async () => await rows.count(), {
                message: 'Expected at least 1 ticket row to be visible',
                timeout: 10000
            }).toBeGreaterThan(0);
            console.log('PHASE A: Ticket rows found:', await rows.count());
        } catch (e) {
            console.error('PHASE A: FAILED - No ticket rows visible after filter click!');
            console.error('This suggests Case 1 (ticket not in API response) or Case 2 (rendering issue)');
            throw e;
        }

        // Verify header and at least one ticket row is visible
        await expect(page.getByTestId('app-header')).toBeVisible();
        await expect(page.getByTestId('ticket-row').first()).toBeVisible({ timeout: 5000 });
    });

    test('should delete ticket with confirmation and redirect to list', async ({ page }) => {
        // Find the first ticket row
        const firstRow = page.getByTestId('ticket-row').first();
        await firstRow.getByTestId('ticket-delete-btn').click();

        // Verify confirmation dialog appears
        await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible({ timeout: 3000 });

        // Set up network response listeners BEFORE clicking confirm
        const deleteResp = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets/') &&
            resp.request().method() === 'DELETE' &&
            [200, 204].includes(resp.status())
        );

        const listRefreshResp = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') &&
            resp.request().method() === 'GET' &&
            resp.status() === 200
        );

        // Confirm deletion
        await page.getByTestId('confirm-delete-btn').click();

        // Wait for both network responses
        await deleteResp;
        await listRefreshResp;

        // Verify success toast appears
        await expect(page.locator('text=deleted successfully')).toBeVisible({ timeout: 5000 });

        // Verify we're still on the ticket list page
        await expect(page).toHaveURL(/\/app\/admin/);

        // CRITICAL: Verify header/nav is still visible (no blank page)
        await expect(page.getByTestId('app-header')).toBeVisible();

        // Verify no "Failed to load ticket" error appears
        await expect(page.locator('text=Failed to load ticket')).not.toBeVisible();

        // Verify the table still loads correctly
        await expect(page.locator('table')).toBeVisible();
    });

    test('should cancel deletion when Cancel is clicked', async ({ page }) => {
        // Count tickets before
        const ticketCountBefore = await page.getByTestId('ticket-row').count();

        // Click delete on first ticket
        const firstRow = page.getByTestId('ticket-row').first();
        await firstRow.getByTestId('ticket-delete-btn').click();

        // Wait for confirmation dialog
        await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();

        // Click Cancel
        await page.getByTestId('cancel-delete-btn').click();

        // Verify dialog is closed
        await expect(page.getByTestId('delete-confirm-dialog')).not.toBeVisible();

        // Verify ticket count unchanged
        const ticketCountAfter = await page.getByTestId('ticket-row').count();
        expect(ticketCountAfter).toBe(ticketCountBefore);
    });

    test('should show proper error when viewing deleted ticket', async ({ page }) => {
        // Delete the ticket
        const firstRow = page.getByTestId('ticket-row').first();
        await firstRow.getByTestId('ticket-delete-btn').click();

        await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();

        const deleteResp = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets/') &&
            resp.request().method() === 'DELETE' &&
            [200, 204].includes(resp.status())
        );

        await page.getByTestId('confirm-delete-btn').click();
        await deleteResp;

        // Try to navigate directly to deleted ticket
        if (createdTicketId) {
            await page.goto(`http://localhost:8060/app/tickets/${createdTicketId}`);

            // Verify proper error message appears (not blank screen)
            await expect(page.locator('text=Ticket Not Found')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('text=This ticket no longer exists')).toBeVisible();

            // Verify Back button is present
            await expect(page.locator('button:has-text("Back")')).toBeVisible();
        }
    });

    test('should not leave open panel after delete', async ({ page }) => {
        // Open ticket in side panel
        const firstRow = page.getByTestId('ticket-row').first();
        await firstRow.getByTestId('ticket-view-btn').click();

        // Verify panel is visible
        await expect(page.locator('text=Ticket Details')).toBeVisible({ timeout: 3000 });

        // From the ticket list, delete the same ticket
        await firstRow.getByTestId('ticket-delete-btn').click();

        await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();

        const deleteResp = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets/') &&
            resp.request().method() === 'DELETE' &&
            [200, 204].includes(resp.status())
        );

        await page.getByTestId('confirm-delete-btn').click();
        await deleteResp;

        // Wait a bit for UI updates
        await page.waitForTimeout(500);

        // Verify panel is closed or shows proper error (not "Failed to load")
        const hasFailedError = await page.locator('text=Failed to load ticket').isVisible().catch(() => false);
        const hasNotFoundError = await page.locator('text=Ticket Not Found').isVisible().catch(() => false);
        const isPanelClosed = !await page.locator('text=Ticket Details').isVisible().catch(() => true);

        // Either panel closed OR shows proper "Not Found" error (not "Failed to load")
        expect(hasFailedError).toBe(false);
        expect(hasNotFoundError || isPanelClosed).toBe(true);
    });
});
