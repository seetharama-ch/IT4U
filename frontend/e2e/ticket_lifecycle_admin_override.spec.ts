import { test, expect } from '@playwright/test';

test.describe('Admin Ticket Override', () => {
    let ticketNumber;

    test('Admin approval should skip manager pending state', async ({ page, request }) => {
        // 1. Employee creates ticket via API (to save time/stability)
        // We need a helper or direct API call. Since strict PROD lock, we use request context.
        // Assuming we have credentials or can use existing users.
        // We need to login as Employee first to get a token/session if API requires it.
        // Or login via UI.

        // Login as Employee
        await page.goto('/login');
        await page.fill('input[name="username"]', 'employee_john'); // Assuming standard user
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/employee');

        // Create Ticket via UI to be safe
        await page.click('a[href="/app/employee/new-ticket"]');
        await page.fill('input[name="title"]', `Admin Override Test ${Date.now()}`);
        await page.fill('textarea[name="description"]', 'Test Description');
        await page.selectOption('select[name="category"]', 'HARDWARE'); // Triggers Approval
        await page.fill('input[name="managerName"]', 'manager_mike');
        await page.click('button:has-text("Submit Request")');

        // Capture Ticket Number from success or list?
        // Wait for success toast
        await expect(page.locator('text=Ticket created successfully')).toBeVisible();

        // Go to list and get ID
        await page.goto('/app/employee');
        const firstTicket = page.locator('table tbody tr').first();
        const ticketText = await firstTicket.innerText();
        // Extract ID if visible (e.g. #123)
        // Assume it's the top one.

        await page.click('button:has-text("Logout")'); // Or equivalent

        // 2. Login as Admin
        await page.goto('/login');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/admin');

        // 3. Find Ticket
        // It might be in "All Tickets"
        // Click on the top ticket
        await page.click('table tbody tr:first-child td:nth-child(2) a, table tbody tr:first-child button[title="View Details"]');

        // 4. Admin Approves
        // Check current status
        // Expect "PENDING MANAGER APPROVAL"
        await expect(page.locator('text=PENDING_MANAGER_APPROVAL')).toBeVisible();

        // Manager Actions section should be visible for Admin
        await expect(page.locator('text=Manager Approval')).toBeVisible();

        await page.check('input[value="APPROVED"]');
        await page.selectOption('select', { label: 'Medium' }); // Priority if asked
        await page.fill('textarea', 'Admin Override');
        await page.click('button:has-text("Submit Review")');

        // 5. Verify Status
        // Expect Modal
        await expect(page.locator('text=Approval Successful')).toBeVisible();
        await page.click('button:has-text("Go to Manager Dashboard")'); // Or similar, waits for navigate

        // Navigate back to ticket details to verify status
        // We need URL or find it again.
        await page.goBack(); // Might work or go to list.
        // Use URL if we had it.
        // Let's assume we are back at list or manager dash. Admin can view.
        // Go to Admin Dash
        await page.goto('/app/admin');
        await page.click('table tbody tr:first-child button[title="View Details"]');

        await expect(page.locator('span:text("OPEN")')).toBeVisible();
        await expect(page.locator('text=PENDING_MANAGER_APPROVAL')).not.toBeVisible();
        await expect(page.locator('text=Manager Approval: APPROVED')).toBeVisible();
    });
});
