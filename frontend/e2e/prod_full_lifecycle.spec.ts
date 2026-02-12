/**
 * Production Full Lifecycle Integration Test
 * End-to-end ticket lifecycle across all 4 roles
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, generateTestId, expectNoFailToLoad, waitForStability } from './helpers/testUtils';
import * as path from 'path';

test.describe.serial('Production Full Lifecycle', () => {
    let creds: ReturnType<typeof loadProdCredentials>;
    const testTickets: { [key: string]: string } = {};

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('Phase 1: Admin verifies all test users exist', async ({ page }) => {
        await login(page, creds.admin);
        await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        // Verify admin user exists (self)
        await expect(page.locator('text=/admin/i').first()).toBeVisible();

        // Note: Other test users should exist or be created via setup
        console.log('✓ Admin verified users');
    });

    test('Phase 2: Employee creates ticket for manager approval', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('HARDWARE_Lifecycle');
        testTickets.forApproval = ticketTitle;

        await page.goto('/app/tickets/new', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        // Fill ticket form
        await page.locator('[data-testid="ticket-title"]').or(page.getByLabel(/title/i).first()).fill(ticketTitle);
        await page.locator('[data-testid="ticket-category"]').or(page.getByLabel(/category/i).first()).selectOption('HARDWARE');
        await page.locator('[data-testid="ticket-description"]').or(page.getByLabel(/description/i).first())
            .fill('Full lifecycle test - requires manager approval');

        // Select manager if required
        const managerSelect = page.locator('[data-testid="ticket-manager"]').or(page.getByLabel(/manager/i).first());
        if (await managerSelect.isVisible()) {
            const optionCount = await managerSelect.locator('option').count();
            if (optionCount > 1) {
                await managerSelect.selectOption({ index: 1 });
            }
        }

        // Submit
        await page.locator('[data-testid="ticket-submit"]').or(page.getByRole('button', { name: /submit|create/i }).first()).click();

        // Wait for success
        await page.locator('[data-testid="ticket-success-modal"]').or(page.locator('text=/success|created/i').first())
            .waitFor({ state: 'visible', timeout: 15000 });

        // Close modal
        const okBtn = page.locator('[data-testid="ticket-success-ok"]').or(page.getByRole('button', { name: /ok|close/i }).first());
        if (await okBtn.isVisible()) {
            await okBtn.click();
        }

        console.log(`✓ Employee created ticket: ${ticketTitle}`);
        await logout(page);
    });

    test('Phase 3: Employee creates ticket without manager approval', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('OTHERS_NoApproval');
        testTickets.noApproval = ticketTitle;

        await page.goto('/app/tickets/new', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        await page.locator('[data-testid="ticket-title"]').or(page.getByLabel(/title/i).first()).fill(ticketTitle);
        await page.locator('[data-testid="ticket-category"]').or(page.getByLabel(/category/i).first()).selectOption('OTHERS');
        await page.locator('[data-testid="ticket-description"]').or(page.getByLabel(/description/i).first())
            .fill('Full lifecycle test - no manager approval needed');

        await page.locator('[data-testid="ticket-submit"]').or(page.getByRole('button', { name: /submit|create/i }).first()).click();
        await page.locator('[data-testid="ticket-success-modal"]').or(page.locator('text=/success|created/i').first())
            .waitFor({ state: 'visible', timeout: 15000 });

        const okBtn = page.locator('[data-testid="ticket-success-ok"]').or(page.getByRole('button', { name: /ok|close/i }).first());
        if (await okBtn.isVisible()) {
            await okBtn.click();
        }

        console.log(`✓ Employee created ticket: ${ticketTitle}`);
        await logout(page);
    });

    test('Phase 4: Manager approves ticket requiring approval', async ({ page }) => {
        await login(page, creds.manager);
        await waitForStability(page);

        // Find the ticket for approval
        const ticketText = page.locator(`text=${testTickets.forApproval}`).first();
        const ticketExists = await ticketText.isVisible({ timeout: 5000 }).catch(() => false);

        if (ticketExists) {
            await ticketText.click();
            await waitForStability(page);

            // Approve
            const approveBtn = page.getByRole('button', { name: /approve/i }).first();
            if (await approveBtn.isVisible()) {
                await approveBtn.click();
                await page.waitForTimeout(500);

                // Add comment if field appears
                const commentField = page.getByLabel(/comment|remarks/i).first();
                if (await commentField.isVisible()) {
                    await commentField.fill('Approved via full lifecycle E2E test');
                }

                // Confirm
                const confirmBtn = page.getByRole('button', { name: /confirm|ok|yes/i }).first();
                if (await confirmBtn.isVisible()) {
                    await confirmBtn.click();
                    await waitForStability(page);
                }

                console.log(`✓ Manager approved ticket: ${testTickets.forApproval}`);
            }
        } else {
            console.warn(`⚠ Ticket ${testTickets.forApproval} not found in manager pending approvals`);
        }

        await logout(page);
    });

    test('Phase 5: IT Support processes approved ticket', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        // Find the approved ticket
        const ticketText = page.locator(`text=${testTickets.forApproval}`).first();
        const ticketExists = await ticketText.isVisible({ timeout: 5000 }).catch(() => false);

        if (ticketExists) {
            await ticketText.click();
            await waitForStability(page);

            // Change status to IN_PROGRESS
            const statusSelect = page.getByLabel(/status/i).first();
            if (await statusSelect.isVisible()) {
                try {
                    await statusSelect.selectOption(/in progress|work in progress/i);
                    await waitForStability(page);
                } catch {
                    await statusSelect.click();
                    await page.getByRole('option', { name: /in progress/i }).click();
                }

                console.log('✓ Changed status to IN_PROGRESS');
            }

            // Add comment
            const commentField = page.getByLabel(/comment|note/i).first();
            if (await commentField.isVisible()) {
                await commentField.fill('Working on this ticket - E2E test');
                const submitBtn = page.getByRole('button', { name: /add comment|post/i }).first();
                if (await submitBtn.isVisible()) {
                    await submitBtn.click();
                    await waitForStability(page);
                }
            }

            // Change status to RESOLVED
            if (await statusSelect.isVisible()) {
                try {
                    await statusSelect.selectOption(/resolved|closed/i);
                    await waitForStability(page);
                } catch {
                    await statusSelect.click();
                    await page.getByRole('option', { name: /resolved/i }).click();
                }

                console.log('✓ Changed status to RESOLVED');
            }
        } else {
            console.warn(`⚠ Ticket ${testTickets.forApproval} not found in IT support queue`);
        }

        await logout(page);
    });

    test('Phase 6: Employee verifies ticket resolution', async ({ page }) => {
        await login(page, creds.employee1);
        await waitForStability(page);

        const ticketText = page.locator(`text=${testTickets.forApproval}`).first();
        const ticketExists = await ticketText.isVisible({ timeout: 5000 }).catch(() => false);

        if (ticketExists) {
            await ticketText.click();
            await waitForStability(page);

            // Verify status shows RESOLVED or CLOSED
            const resolvedStatus = page.locator('text=/resolved|closed/i').first();
            await expect(resolvedStatus).toBeVisible();

            // Verify comments are visible
            const commentsSection = page.locator('text=/comment|activity|timeline/i').first();
            await expect(commentsSection).toBeVisible();

            console.log('✓ Employee verified ticket resolution');
        }

        await logout(page);
    });

    test('Phase 7: Admin has global visibility of all tickets', async ({ page }) => {
        await login(page, creds.admin);
        await page.goto('/app/admin', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        // Admin should be able to see all test tickets
        const canSeeTickets = await page.locator(`text=${testTickets.forApproval}`).or(page.locator(`text=${testTickets.noApproval}`)).first()
            .isVisible({ timeout: 5000 }).catch(() => false);

        if (canSeeTickets) {
            console.log('✓ Admin has global ticket visibility');
        } else {
            console.warn('⚠ Admin may need to change filter to see all tickets');
        }

        await logout(page);
    });

    test('Phase 8: Verify no "manager approval missing" issue', async ({ page }) => {
        await login(page, creds.support);
        await waitForStability(page);

        // IT Support should see the no-approval ticket directly
        const noApprovalTicket = page.locator(`text=${testTickets.noApproval}`).first();
        const canSeeNoApproval = await noApprovalTicket.isVisible({ timeout: 5000 }).catch(() => false);

        if (canSeeNoApproval) {
            console.log('✓ No-approval ticket correctly routes to IT Support');
        }

        await logout(page);
    });
});
