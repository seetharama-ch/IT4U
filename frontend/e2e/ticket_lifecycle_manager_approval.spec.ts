
import { test, expect } from '@playwright/test';
import { loginAs } from './utils/login-helpers';

test.describe('Ticket Lifecycle - Manager Approval', () => {
    test('Manager can view and approve assigned tickets', async ({ page }) => {
        // 1. Employee Creates Ticket (category HARDWARE needs approval)
        await loginAs(page, 'employee');

        await page.click('text=New Ticket');
        await page.fill('input[name="title"]', 'Manager Approval Test');
        await page.fill('textarea[name="description"]', 'Requesting new keyboard');
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.selectOption('select[name="priority"]', 'MEDIUM');
        await page.click('button:has-text("Submit Request")');

        // Wait for redirection
        // Wait for redirection to ticket details
        // Wait for success modal or redirection to employee dashboard
        // The app redirects to /app/employee on success
        await expect(page).toHaveURL(/\/app\/employee/);

        // Go to ticket list to find the new ticket
        // For the test flow, we need the ID. We can grab it from the list or assume it's the top one.
        // Or we can rely on the fact that we just created it.
        // Let's filter by title to be safe.
        await page.reload();
        await page.click('text=Hardware Support Required');

        const ticketId = (await page.url()).split('/').pop();
        console.log('Created Ticket ID:', ticketId);

        // 2. Manager Login
        await loginAs(page, 'manager');

        // Manager should see it in "Pending Approvals" or Dashboard
        // Usually dashboard lists tickets.
        await page.goto('/app/manager'); // Ensure on dashboard
        // Check if ticket is visible in Pending Approval section?
        // Or directly navigate to verify access
        await page.goto(`/app/tickets/${ticketId}`);

        // 3. Approve
        await expect(page.locator('h4:has-text("Manager Approval")')).toBeVisible();
        await page.check('input[value="APPROVED"]');
        await page.selectOption('select', 'MEDIUM'); // Set priority
        await page.fill('textarea[placeholder="Add a reason or note..."]', 'Approved by manager');
        await page.click('button:has-text("Submit Review")');

        // 4. Verify Success
        await expect(page.locator('text=Approval Recorded')).toBeVisible();
        await page.click('button:has-text("Return to Dashboard")');

        // 5. Verify Status
        await page.goto(`/app/tickets/${ticketId}`);
        await expect(page.locator('text=APPROVED')).toBeVisible();
        // Status should be OPEN
        await expect(page.locator('text=OPEN')).toBeVisible();
    });
});
