
import { test, expect } from './fixtures/bugRecorder';
import { login, logout } from './helpers/auth';
import { employeeCreateTicket, supportProcessTicket, managerApproveTicket } from './helpers/tickets';

const USERS = {
    emp1: { name: 'Employee One', username: 'emp1', email: 'emp1@gsg.in', password: 'Pass@123', role: 'EMPLOYEE' as const },
    sup1: { name: 'Support One', username: 'sup1', email: 'sup1@gsg.in', password: 'Pass@123', role: 'IT_SUPPORT' as const },
    mgr1: { name: 'Manager One', username: 'mgr1', email: 'mgr1@gsg.in', password: 'Pass@123', role: 'MANAGER' as const },
};

test.describe('Ticket Segregation Repro', () => {
    test.use({ ignoreHTTPSErrors: true });

    test('Ticket Segregation Lifecycle', async ({ page }) => {
        // 1. Employee Creates Ticket
        await login(page, USERS.emp1);
        const t1 = await employeeCreateTicket(page, {
            title: 'Segregation Ticket',
            description: 'Testing Open vs Resolved',
            category: 'SOFTWARE', // Needs approval => PENDING_MANAGER_APPROVAL
            managerName: 'mgr1'
        });

        // Verify in OPEN list (for Employee) because it's PENDING_MANAGER_APPROVAL which is "Active"
        await expect(page.getByText(t1.ticketNo)).toBeVisible();

        await logout(page);

        // 2. Manager Check & Approval
        await login(page, USERS.mgr1);

        // Should be in "Pending Approvals" tab (Default)
        await expect(page.getByText(t1.ticketNo)).toBeVisible();

        // Manager Approves
        await managerApproveTicket(page, t1.ticketNo);

        // Should NOT be in "Pending Approvals" anymore
        // Note: UI might auto-switch tab or remove row.
        // We ensure it's gone from the current view (Pending)
        await expect(page.locator('tr').filter({ hasText: t1.ticketNo })).not.toBeVisible();

        await logout(page);

        // 3. Support Resolves
        await login(page, USERS.sup1);
        await supportProcessTicket(page, t1.ticketNo); // Marks In Progress then Resolved
        await logout(page);

        // 4. Employee Verification (The Core Fix)
        await login(page, USERS.emp1);

        // Default is "All" or "Open"? 
        // If default is All, it might be visible.
        // Check "Open" Tab specifically.
        await page.getByRole('button', { name: 'Open' }).click();

        // Assert: Ticket is NOT in Open
        await expect(page.getByText(t1.ticketNo)).not.toBeVisible();

        // Check "Resolved" Tab
        await page.getByRole('button', { name: 'Resolved' }).click();

        // Assert: Ticket IS in Resolved
        await expect(page.getByText(t1.ticketNo)).toBeVisible();

        await logout(page);
    });
});
