import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Serial execution is required as steps depend on previous state
test.describe.serial('Issue-11: IT Support Status Transition after Manager Approval', () => {

    const ticketFile = path.join(process.cwd(), 'e2e', '.auth', 'issue11-ticket.json');

    // 1. Employee Creates Ticket
    test('Employee creates a new hardware ticket', async ({ browser }) => {
        // Use Employee Storage State
        const context = await browser.newContext({ storageState: 'e2e/.auth/employee.json' });
        const page = await context.newPage();

        await page.goto('http://localhost:9092/app/tickets/new');
        console.log(`Navigated to: ${page.url()}`);

        // Debug: Log cookies
        const cookies = await context.cookies();
        console.log('Cookies:', cookies.map(c => `${c.name}=${c.value}`).join('; '));

        // Fill Ticket Form
        // Wait for connection/render (Option C: Explicit visibility wait)
        const titleInput = page.locator('input[name="title"]');
        await expect(titleInput).toBeVisible({ timeout: 60_000 });
        await titleInput.fill('Issue 11 Test Ticket');
        await page.fill('textarea[name="description"]', 'Testing admin status transitions via E2E');
        await page.selectOption('select[name="priority"]', 'MEDIUM');
        await page.selectOption('select[name="category"]', 'HARDWARE');

        // Submit
        await page.click('button[type="submit"]');

        // Verify creation and get ID from URL or list
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        const url = page.url();
        const ticketId = url.split('/').pop();
        console.log(`Created Ticket ID: ${ticketId}`);

        // Save ID for next tests
        fs.writeFileSync(ticketFile, JSON.stringify({ ticketId }));

        await context.close();
    });

    // 2. Manager Approves Ticket
    test('Manager approves the ticket', async ({ browser }) => {
        // Read Ticket ID
        if (!fs.existsSync(ticketFile)) test.skip('No ticket created');
        const { ticketId } = JSON.parse(fs.readFileSync(ticketFile, 'utf-8'));

        const context = await browser.newContext({ storageState: 'e2e/.auth/manager.json' });
        const page = await context.newPage();

        await page.goto(`http://localhost:9092/app/tickets/${ticketId}`);

        // Verify Pending Status
        await expect(page.locator('text=Pending Manager Approval')).toBeVisible();

        // Approve (Look for "Approve" label in radio)
        // Based on TicketDetails.jsx: <input type="radio" value="APPROVED" ... /> <span>Approve</span>
        // Check Manager Approval card visibility
        await expect(page.locator('h4:has-text("Manager Approval")')).toBeVisible();
        await page.check('input[value="APPROVED"]');

        // Select Priority (Required for Hard/Sec)
        await page.selectOption('select', 'HIGH'); // Generic select or improve selector if multiple

        // Comment (Optional)
        await page.fill('textarea', 'Approved via E2E');

        // Submit
        await page.click('button:has-text("Submit Review")');

        // Wait for modal or status update
        // Modal logic: navigate('/app/manager') on OK.
        // Or check text Update?
        // Let's wait for modal "Approval Submitted" or similar if logic exists, or just check URL/Dashboard.
        // Code: setApprovalModal({ open: true ... })
        await expect(page.locator('div[role="dialog"]')).toBeVisible();
        await page.click('button:has-text("OK")');

        await context.close();
    });

    // 3. IT Support Transitions Status
    test('IT Support transitions ticket to IN_PROGRESS -> RESOLVED -> CLOSED', async ({ browser }) => {
        if (!fs.existsSync(ticketFile)) test.skip('No ticket created');
        const { ticketId } = JSON.parse(fs.readFileSync(ticketFile, 'utf-8'));

        const context = await browser.newContext({ storageState: 'e2e/.auth/it_support.json' });
        const page = await context.newPage();

        // 3a. Update to IN_PROGRESS
        await page.goto(`http://localhost:9092/app/tickets/${ticketId}`);

        // Check visibility of Admin Actions
        await expect(page.locator('h4:has-text("Admin Actions")')).toBeVisible();

        // Update Assignment: IT Support needs to own it to resolve/close.
        // Try 'Assign to Me' button if visible
        const assignMeBtn = page.getByRole('button', { name: 'Assign to Me' });
        if (await assignMeBtn.isVisible()) {
            await assignMeBtn.click();
            await page.waitForTimeout(500); // UI update
        } else {
            // Or select from dropdown
            const assignSelect = page.getByTestId('admin-ticket-assign-select');
            if (await assignSelect.isVisible()) {
                // Try selecting by value if we knew ID or by label containing 'it support'
                // Since we don't know exact ID of 'it_support_jane' easily without fetching, 
                // we rely on 'Assign to Me' usually being available if unassigned.
                // If already assigned, proceed.
            }
        }

        // Status: IN_PROGRESS
        await page.selectOption('[data-testid="admin-ticket-status-select"]', 'IN_PROGRESS');
        await page.click('[data-testid="admin-ticket-submit"]');

        // Verify update (Toast or badge change)
        await expect(page.locator('text=Ticket updated successfully')).toBeVisible();
        // Wait for badge update
        await expect(page.locator('div.card >> text=Current Status >> .. >> text=IN_PROGRESS')).toBeVisible();

        // 3b. Resolve
        // Reload to ensure clean state? UI might update in place, but safe to reload.
        // await page.reload(); 
        // Code stays on page and refetches.

        await page.selectOption('[data-testid="admin-ticket-status-select"]', 'RESOLVED');
        await page.click('[data-testid="admin-ticket-submit"]');
        await expect(page.locator('text=Ticket updated successfully')).toBeVisible();
        await expect(page.locator('div.card >> text=Current Status >> .. >> text=RESOLVED')).toBeVisible();

        // 3c. Close
        await page.selectOption('[data-testid="admin-ticket-status-select"]', 'CLOSED');
        await page.click('[data-testid="admin-ticket-submit"]');
        await expect(page.locator('text=Ticket updated successfully')).toBeVisible();
        await expect(page.locator('div.card >> text=Current Status >> .. >> text=CLOSED')).toBeVisible();

        await context.close();
    });
});
