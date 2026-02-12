import { test, expect } from '@playwright/test';
import { createTestTicketAsEmployee, loginAs, logout } from '../utils/utils';

test.describe('Manager approval flow', () => {

    test('Manager sees and approves pending ticket', async ({ page }) => {
        // 1. Create ticket as employee
        await createTestTicketAsEmployee(page, {
            employeeUser: 'employee_john',
            employeePass: 'password',
            title: 'Manager Flow – Approve',
            category: 'SOFTWARE',
            softwareName: 'App A',
            version: '1.0',
            managerLabel: 'manager_mike', // Value/Text match
        });

        await logout(page);

        // 2. Login as manager
        await loginAs(page, 'manager_mike', 'password');

        // 3. Go to Pending Approvals tab (Default view verified as Team Approvals)
        await expect(page.getByRole('heading', { name: /Team Approvals/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Pending Approvals/i })).toHaveClass(/border-\[var\(--accent\)\]/);

        // 4. Find the ticket row & Verify Approve button exists
        const ticketRow = page.getByRole('row').filter({ hasText: /Manager Flow – Approve/i });
        await expect(ticketRow).toBeVisible();

        // 5. Approve via List Action
        page.on('dialog', dialog => dialog.accept());
        await ticketRow.getByRole('button', { name: /Approve/i }).click();

        // 6. Verify success notification
        await expect(page.getByText(/forwarded as approved/i)).toBeVisible();

        // 7. Verify tab switched to Approved Tickets
        await expect(page.getByRole('button', { name: /Approved Tickets/i })).toHaveClass(/border-\[var\(--accent\)\]/);

        // 8. Verify ticket appears in Approved list
        const approvedRow = page.getByRole('row').filter({ hasText: /Manager Flow – Approve/i });
        await expect(approvedRow).toBeVisible();

        // 9. Verify Status and Timestamp
        await expect(approvedRow.getByText(/OPEN/i)).toBeVisible();
        // Check for a date (formatted string)
        await expect(approvedRow.locator('td').nth(6)).not.toBeEmpty();

        // 10. Switch back to Pending to confirm it's gone
        await page.getByRole('button', { name: /Pending Approvals/i }).click();
        await expect(page.getByRole('row').filter({ hasText: /Manager Flow – Approve/i })).toBeHidden();
    });

    // Optional: Reject test if time permits, but this covers the core requirement
});
