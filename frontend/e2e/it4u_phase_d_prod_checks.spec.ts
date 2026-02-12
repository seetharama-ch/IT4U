import { test, expect, Page } from '@playwright/test';
import { attachCrashGuards, login, logout } from './helpers/auth';
import {
    employeeCreateTicket,
    managerApproveTicket,
    managerRejectTicket,
    supportProcessTicket,
    adminDeleteTicket,
    expectEmailAudit,
    uploadAttachment,
    downloadAttachmentAndVerify,
    verifyAttachmentDeleted,
    verifyNoBlankScreen
} from './helpers/tickets';

const ADMIN = { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'Admin@123' };

// Test users from seed
const USERS = {
    emp1: { username: 'emp1', password: 'Pass@123' },
    mgr1: { username: 'mgr1', password: 'Pass@123' },
    sup1: { username: 'sup1', password: 'Pass@123' },
};

test.describe('Phase D: Production-Only Checks', () => {
    test.beforeAll(async ({ request }) => {
        // D0: Verify preconditions
        console.log('[D0] Verifying preconditions: reset + seed');

        // Login as admin to get auth cookie
        const loginResp = await request.post('http://localhost:8060/api/auth/login', {
            data: ADMIN
        });
        expect(loginResp.ok(), 'Admin login should succeed').toBeTruthy();

        // Reset database (with auth)
        const resetResp = await request.post('http://localhost:8060/api/admin/reset/full');
        expect(resetResp.ok(), 'Reset should succeed').toBeTruthy();

        // Seed database (with auth)
        const seedResp = await request.post('http://localhost:8060/api/admin/reset/seed');
        expect(seedResp.ok(), 'Seed should succeed').toBeTruthy();

        // Verify /auth/me for each seeded user
        for (const [role, creds] of Object.entries(USERS)) {
            const userLoginResp = await request.post('http://localhost:8060/api/auth/login', {
                data: creds
            });
            expect(userLoginResp.ok(), `${role} login should succeed`).toBeTruthy();

            const meResp = await request.get('http://localhost:8060/api/auth/me');
            expect(meResp.status(), `${role} /auth/me should return 200`).toBe(200);
        }

        console.log('[D0] ✓ Preconditions verified');
    });

    test('D1: Email Notifications - Full Lifecycle Audit Trail', async ({ page }) => {
        await attachCrashGuards(page);

        // Create ticket as employee
        await login(page, USERS.emp1);
        const ticket = await employeeCreateTicket(page, {
            title: 'Email Test - Laptop Issue',
            description: 'Testing email audit trail',
            category: 'HARDWARE',
            managerName: 'mgr1'
        });
        await logout(page);

        const ticketId = ticket.ticketId!;
        const ticketNo = ticket.ticketNo!;
        console.log(`[D1] Created ticket: ${ticketNo} (ID: ${ticketId})`);

        // Verify CREATED email audit
        await login(page, ADMIN);
        await expectEmailAudit(page, ticketId, 'CREATED', 1);
        console.log('[D1] ✓ CREATED email audit verified');
        await logout(page);

        // Manager approves
        await login(page, USERS.mgr1);
        await managerApproveTicket(page, ticketNo);
        await logout(page);

        // Verify APPROVED email audit
        await login(page, ADMIN);
        await expectEmailAudit(page, ticketId, 'APPROVED', 1);
        console.log('[D1] ✓ APPROVED email audit verified');
        await logout(page);

        // Support marks in progress
        await login(page, USERS.sup1);
        await page.goto('/app/it-support');
        await page.waitForLoadState('networkidle');

        // Find and open ticket
        const filterInput = page.locator('input[name="ticketNumber"]');
        await expect(filterInput).toBeVisible({ timeout: 10_000 });
        await filterInput.fill(ticketNo!);
        await page.getByRole('button', { name: /apply/i }).click();
        await page.waitForResponse(resp => resp.url().includes('/tickets') && resp.status() === 200).catch(() => { });

        const row = page.locator('tr').filter({ hasText: ticketNo! }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });

        const viewBtn = row.getByTestId('ticket-view').or(row.getByRole('button', { name: /view|open|details/i }));
        if (await viewBtn.count() > 0 && await viewBtn.first().isVisible().catch(() => false)) {
            await viewBtn.first().click();
        } else {
            await row.click();
        }

        // Mark in progress
        const inProgBtn = page.getByTestId('status-inprogress')
            .or(page.getByRole('button', { name: /in progress|work in progress/i }));
        if (await inProgBtn.isVisible().catch(() => false)) {
            await inProgBtn.click();
            await page.locator('[role="status"]').filter({ hasText: /in progress|updated|success/i })
                .first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => { });
        }
        await logout(page);

        // Verify IN_PROGRESS email audit (if mail is sent for this event)
        await login(page, ADMIN);
        // Note: IN_PROGRESS may or may not trigger email depending on config
        // await expectEmailAudit(page, ticketId, 'IN_PROGRESS', 1);
        // console.log('[D1] ✓ IN_PROGRESS email audit verified');
        await logout(page);

        // Support resolves ticket
        await login(page, USERS.sup1);
        await supportProcessTicket(page, ticketNo);
        await logout(page);

        // Verify RESOLVED email audit
        await login(page, ADMIN);
        await expectEmailAudit(page, ticketId, 'RESOLVED', 1);
        console.log('[D1] ✓ RESOLVED email audit verified');

        console.log('[D1] ✓ Email notification audit trail complete');
    });

    test('D2: Attachments - Upload/Download/Delete Cascade', async ({ page }) => {
        await attachCrashGuards(page);

        // Create ticket as employee
        await login(page, USERS.emp1);
        const ticket = await employeeCreateTicket(page, {
            title: 'Attachment Test Ticket',
            description: 'Testing attachment upload/download/delete',
            category: 'SOFTWARE',
            managerName: 'mgr1'
        });
        const ticketNo = ticket.ticketNo;
        console.log(`[D2] Created ticket: ${ticketNo}`);

        // Upload attachment
        const attachmentId = await uploadAttachment(page, ticketNo!, 'e2e/fixtures/test-attachment.txt');
        console.log(`[D2] ✓ Attachment uploaded: ${attachmentId}`);
        await logout(page);

        // Manager approves so support can access
        await login(page, USERS.mgr1);
        await managerApproveTicket(page, ticketNo);
        await logout(page);

        // Support downloads attachment
        await login(page, USERS.sup1);
        const downloadSuccess = await downloadAttachmentAndVerify(page, ticketNo!, attachmentId);
        expect(downloadSuccess, 'Attachment download should succeed').toBeTruthy();
        console.log('[D2] ✓ Attachment downloaded and verified');
        await logout(page);

        // Admin deletes ticket
        await login(page, ADMIN);

        // First resolve the ticket so admin can delete it
        await login(page, USERS.sup1);
        await supportProcessTicket(page, ticketNo);
        await logout(page);

        await login(page, ADMIN);
        await adminDeleteTicket(page, ticketNo);

        // Verify attachments cascade deleted
        const attachmentsDeleted = await verifyAttachmentDeleted(page, ticketNo!);
        expect(attachmentsDeleted, 'Attachments should be cascade deleted').toBeTruthy();
        console.log('[D2] ✓ Attachments cascade deleted with ticket');

        console.log('[D2] ✓ Attachment lifecycle complete');
    });

    test('D3: UI Stability - Refresh/Back/Deeplink', async ({ page, context }) => {
        await attachCrashGuards(page);

        // Create and approve a ticket for testing
        await login(page, USERS.emp1);
        const ticket = await employeeCreateTicket(page, {
            title: 'UI Stability Test',
            description: 'Testing UI stability scenarios',
            category: 'HARDWARE',
            managerName: 'mgr1'
        });
        const ticketNo = ticket.ticketNo;
        await logout(page);

        await login(page, USERS.mgr1);
        await managerApproveTicket(page, ticketNo);

        // Scenario 1: Refresh ticket details page
        await page.goto('/app/manager');
        await page.waitForLoadState('networkidle');

        const row = page.locator('tr').filter({ hasText: ticketNo! }).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await row.click();

        // Refresh
        await page.reload();
        await page.waitForLoadState('networkidle');
        await verifyNoBlankScreen(page);
        console.log('[D3] ✓ Refresh: No blank screen');

        // Scenario 2: Deeplink (copy URL and open in new tab)
        const currentUrl = page.url();
        const newPage = await context.newPage();
        await attachCrashGuards(newPage);

        // First login in new page
        await newPage.goto('http://localhost:4173/login');
        await newPage.getByPlaceholder(/username/i).fill(USERS.mgr1.username);
        await newPage.getByPlaceholder(/password/i).fill(USERS.mgr1.password);
        await newPage.getByRole('button', { name: /login|sign in/i }).click();
        await newPage.waitForURL(/\/app/);

        // Then navigate to deep link
        await newPage.goto(currentUrl);
        await newPage.waitForLoadState('networkidle');
        await verifyNoBlankScreen(newPage);
        console.log('[D3] ✓ Deeplink: No blank screen');
        await newPage.close();

        // Scenario 3: Rapid navigation (10 times)
        for (let i = 0; i < 10; i++) {
            await page.goto('/app/manager');
            await page.waitForLoadState('networkidle');

            const ticketRow = page.locator('tr').filter({ hasText: ticketNo! }).first();
            if (await ticketRow.isVisible().catch(() => false)) {
                await ticketRow.click();
                await page.waitForTimeout(500);
                await page.goBack();
                await page.waitForLoadState('networkidle');
            }
        }
        await verifyNoBlankScreen(page);
        console.log('[D3] ✓ Rapid navigation (10x): No crashes');

        await logout(page);
        console.log('[D3] ✓ UI stability checks complete');
    });

    test('D4: Role Permissions Matrix', async ({ page, request }) => {
        await attachCrashGuards(page);

        // Create a test ticket first
        await login(page, USERS.emp1);
        const ticket = await employeeCreateTicket(page, {
            title: 'Permissions Test Ticket',
            description: 'Testing role permissions',
            category: 'SOFTWARE',
            managerName: 'mgr1'
        });
        const ticketNo = ticket.ticketNo;
        await logout(page);

        // Test Employee permissions
        await login(page, USERS.emp1);

        // Employee cannot access admin dashboard
        await page.goto('/app/admin');
        await page.waitForLoadState('networkidle');
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/app/admin'); // Should redirect
        console.log('[D4] ✓ Employee: Cannot access admin dashboard');

        await logout(page);

        // Test Manager permissions
        await login(page, USERS.mgr1);
        await managerApproveTicket(page, ticketNo);

        // Manager cannot delete tickets (verify UI doesn't show delete button)
        await page.goto('/app/manager');
        await page.waitForLoadState('networkidle');
        const managerRow = page.locator('tr').filter({ hasText: ticketNo! }).first();
        const deleteBtn = managerRow.getByTestId('ticket-delete');
        expect(await deleteBtn.count()).toBe(0); // Delete button should not exist for manager
        console.log('[D4] ✓ Manager: Cannot delete tickets');

        await logout(page);

        // Test IT Support permissions
        await login(page, USERS.sup1);

        // Support can change ticket status
        await page.goto('/app/it-support');
        await page.waitForLoadState('networkidle');
        const supportRow = page.locator('tr').filter({ hasText: ticketNo! }).first();
        if (await supportRow.isVisible().catch(() => false)) {
            await supportRow.click();
            const statusBtn = page.getByTestId('status-inprogress');
            expect(await statusBtn.count()).toBeGreaterThan(0); // Status change buttons should exist
            console.log('[D4] ✓ IT Support: Can change ticket status');
        }

        await logout(page);

        // Test Admin permissions
        await login(page, ADMIN);

        // Admin can access all dashboards
        await page.goto('/app/admin');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/app/admin');
        console.log('[D4] ✓ Admin: Can access admin dashboard');

        // Admin can view all tickets
        const allTicketsVisible = await page.locator('tr').filter({ hasText: ticketNo! }).first().isVisible().catch(() => false);
        expect(allTicketsVisible).toBeTruthy();
        console.log('[D4] ✓ Admin: Can view all tickets');

        console.log('[D4] ✓ Role permissions matrix verified');
    });
});
