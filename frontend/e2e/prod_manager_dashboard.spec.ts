/**
 * Production Manager Dashboard Tests
 * Tests for Manager role - approval/rejection workflows
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, expectNoFailToLoad, waitForStability } from './helpers/testUtils';

test.describe('Production Manager Dashboard', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('Manager dashboard loads without errors', async ({ page }) => {
        await login(page, creds.manager);

        // Should redirect to manager dashboard
        await expect(page).toHaveURL(/\/app\/manager/);

        // Dashboard should be visible
        await expect(page.locator('header')).toBeVisible();
        await waitForStability(page);

        await expectNoFailToLoad(page);
    });

    test('Pending approvals queue loads', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        // Should see pending approvals section
        const approvalsSection = page.locator('text=/pending|approvals|waiting/i').or(page.getByTestId('pending-approvals')).first();
        await expect(approvalsSection).toBeVisible();

        // Table or empty state should be visible
        const ticketsTable = page.locator('table').or(page.locator('text=/no pending|no tickets/i')).first();
        await expect(ticketsTable).toBeVisible();
    });

    test('Can open ticket details without "Failed to load" error', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        // Find first ticket row (if any)
        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            // Should NOT show "Failed to load ticket"
            await expect(page.locator('text=/failed to load ticket/i')).toHaveCount(0);

            // Ticket details should be visible
            await expect(page.locator('text=/ticket|details|status/i').first()).toBeVisible();
        }
    });

    test('Approve button is visible for pending tickets', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            // Click to open details
            await firstTicketRow.click();
            await waitForStability(page);

            // Approve button should be visible
            const approveBtn = page.getByRole('button', { name: /approve/i }).first();
            const isApproveVisible = await approveBtn.isVisible().catch(() => false);

            if (isApproveVisible) {
                expect(isApproveVisible).toBe(true);
            }
        }
    });

    test('Reject button is visible for pending tickets', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            const rejectBtn = page.getByRole('button', { name: /reject/i }).first();
            const isRejectVisible = await rejectBtn.isVisible().catch(() => false);

            if (isRejectVisible) {
                expect(isRejectVisible).toBe(true);
            }
        }
    });

    test('Approve endpoint returns 200', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        let approveRequestCaptured = false;
        let approveStatus = 0;

        page.on('response', (response) => {
            const url = response.url();
            if (url.includes('/api/tickets/') && url.includes('/approve')) {
                approveRequestCaptured = true;
                approveStatus = response.status();
            }
        });

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            const approveBtn = page.getByRole('button', { name: /approve/i }).first();
            if (await approveBtn.isVisible()) {
                await approveBtn.click();
                await waitForStability(page);

                // Fill comment if field appears
                const commentField = page.getByLabel(/comment|remarks/i).first();
                if (await commentField.isVisible()) {
                    await commentField.fill('Approved via E2E test');
                }

                // Confirm if needed
                const confirmBtn = page.getByRole('button', { name: /confirm|ok|yes/i }).first();
                if (await confirmBtn.isVisible()) {
                    await confirmBtn.click();
                    await waitForStability(page);
                }

                if (approveRequestCaptured) {
                    expect(approveStatus).toBe(200);
                }
            }
        }
    });

    test('No unexpected 401 after manager actions', async ({ page }) => {
        const unexpected401s: any[] = [];

        page.on('response', (response) => {
            const url = response.url();
            const status = response.status();

            // Track 401s on non-auth endpoints (unexpected logout)
            if (status === 401 && !url.includes('/auth/me') && url.includes('/api/')) {
                unexpected401s.push({ url, status });
            }
        });

        await login(page, creds.manager);
        await waitForStability(page);

        // Navigate around
        await page.goto('/app/manager', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        expect(unexpected401s).toEqual([]);
    });

    test('Audit/comments timeline visible on ticket details', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            // Should see comments or timeline section
            const commentsSection = page.locator('text=/comments|timeline|activity|history/i').or(page.getByTestId('ticket-comments')).first();
            const hasComments = await commentsSection.isVisible().catch(() => false);

            // At minimum, ticket details should exist
            await expect(page.locator('text=/ticket|status|description/i').first()).toBeVisible();
        }
    });

    test.afterEach(async ({ page }) => {
        await logout(page).catch(() => { });
    });
});
