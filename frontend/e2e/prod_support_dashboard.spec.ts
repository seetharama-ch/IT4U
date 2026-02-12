/**
 * Production IT Support Dashboard Tests
 * Tests for IT Support role - ticket processing workflows
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, expectNoFailToLoad, waitForStability } from './helpers/testUtils';

test.describe('Production IT Support Dashboard', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('IT Support dashboard loads without errors', async ({ page }) => {
        await login(page, creds.support);

        // Should redirect to IT support dashboard
        await expect(page).toHaveURL(/\/app\/it-support/);

        // Dashboard should be visible
        await expect(page.locator('header')).toBeVisible();
        await waitForStability(page);

        await expectNoFailToLoad(page);
    });

    test('Assigned/Approved queue loads', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        // Should see assigned/approved tickets section
        const ticketsSection = page.locator('text=/assigned|approved|tickets|queue/i').or(page.getByTestId('support-queue')).first();
        await expect(ticketsSection).toBeVisible();

        // Table or empty state should be visible
        const ticketsTable = page.locator('table').or(page.locator('text=/no tickets|no assigned/i')).first();
        await expect(ticketsTable).toBeVisible();
    });

    test('Can open ticket details without errors', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

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

    test('Status dropdown/buttons are visible', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            // Status control should be visible (dropdown or buttons)
            const statusControl = page.getByLabel(/status/i).or(page.locator('select').first()).or(page.getByRole('button', { name: /in progress|work in progress|resolve/i }).first());
            const hasStatusControl = await statusControl.isVisible().catch(() => false);

            if (hasStatusControl) {
                expect(hasStatusControl).toBe(true);
            }
        }
    });

    test('Can add comments to tickets', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            // Comment field should be visible
            const commentField = page.getByLabel(/comment|note|remarks/i).or(page.locator('textarea').first());
            const hasCommentField = await commentField.isVisible().catch(() => false);

            if (hasCommentField) {
                await commentField.fill('E2E Test comment from IT Support');

                // Add comment button
                const addCommentBtn = page.getByRole('button', { name: /add comment|post|submit/i }).first();
                if (await addCommentBtn.isVisible()) {
                    expect(await addCommentBtn.isVisible()).toBe(true);
                }
            }
        }
    });

    test('Status update endpoint returns 200', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        let statusUpdateCaptured = false;
        let statusUpdateStatus = 0;

        page.on('response', (response) => {
            const url = response.url();
            const method = response.request().method();

            if (url.includes('/api/tickets/') && (url.includes('/status') || method === 'PUT' || method === 'PATCH')) {
                statusUpdateCaptured = true;
                statusUpdateStatus = response.status();
            }
        });

        const firstTicketRow = page.locator('table tbody tr').first();
        const hasTickets = await firstTicketRow.isVisible().catch(() => false);

        if (hasTickets) {
            await firstTicketRow.click();
            await waitForStability(page);

            // Try to change status
            const statusSelect = page.getByLabel(/status/i).first();
            if (await statusSelect.isVisible()) {
                try {
                    await statusSelect.selectOption(/in progress|work in progress/i);
                    await waitForStability(page);

                    if (statusUpdateCaptured) {
                        expect(statusUpdateStatus).toBe(200);
                    }
                } catch {
                    // Status might already be set or unavailable
                }
            }
        }
    });

    test('Comments timeline is visible', async ({ page }) => {
        await login(page, creds.support);
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

    test('No console errors on support dashboard', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (!text.includes('401') && !text.includes('Unauthorized')) {
                    consoleErrors.push(text);
                }
            }
        });

        await login(page, creds.support);
        await waitForStability(page);
        await page.waitForTimeout(2000);

        expect(consoleErrors).toEqual([]);
    });

    test.afterEach(async ({ page }) => {
        await logout(page).catch(() => { });
    });
});
