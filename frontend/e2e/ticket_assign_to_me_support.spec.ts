import { test, expect } from '@playwright/test';

test.describe('IT Support Assign', () => {
    test('IT Support can assign ticket to self', async ({ page }) => {
        // Prerequisite: Ticket should be OPEN. 
        // We'll create one as Employee first simply.
        await page.goto('/login');
        await page.fill('input[name="username"]', 'employee_john');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL('/app/employee');

        await page.click('a[href="/app/employee/new-ticket"]');
        await page.fill('input[name="title"]', `Support Assign Test ${Date.now()}`);
        await page.fill('textarea[name="description"]', 'Test Description');
        // Category OTHERS might skip approval -> OPEN
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.click('button:has-text("Submit Request")');
        await expect(page.locator('text=Ticket created successfully')).toBeVisible();
        await page.click('button:has-text("Logout")');

        // Login as IT Support
        await page.goto('/login');
        await page.fill('input[name="username"]', 'support_sara'); // Assuming user
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/tickets'); // Support dashboard

        // Open Ticket
        await page.click('table tbody tr:first-child button[title="View Details"]');

        // Assert Unassigned
        await expect(page.locator('text=Assigned To: Unassigned')).toBeVisible();

        // Click Assign to Me (In Admin Actions panel)
        // Check if button exists
        await expect(page.locator('button:has-text("Assign to Me")')).toBeVisible();
        await page.click('button:has-text("Assign to Me")');

        // Verify
        // Page should reload or update
        // Check "Assigned To: support_sara"
        await expect(page.locator('text=Assigned To:')).toContainText('support_sara');
        // Check status might update to IN_PROGRESS if logic exists
        await expect(page.locator('text=IN_PROGRESS')).toBeVisible();
    });
});
