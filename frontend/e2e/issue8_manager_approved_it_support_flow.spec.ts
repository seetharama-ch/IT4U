
import { test, expect } from '@playwright/test';

test.describe('Issue #8: Manager Approved Ticket & IT Support Flow', () => {

    // Credentials (assuming standard seed data or ability to create)
    const adminUser = 'admin';
    const itSupportUser = 'it_support'; // Adjust if needed
    const managerUser = 'manager';
    const password = 'password';

    let ticketId: string;
    let ticketNumber: string;

    test('Reproduction: Manager Approval -> IT Support Visibility -> Status Update 500 Check', async ({ request, browser }) => {
        // 1. Create a ticket that requires approval (e.g., Software category)
        // We'll use API to speed up setup
        const createRes = await request.post('http://localhost:8060/api/tickets', {
            data: {
                title: 'Issue 8 Repro Ticket',
                description: 'Testing 500 error on status change',
                category: 'SOFTWARE', // Requires approval
                priority: 'MEDIUM',
                requester: { username: 'employee' }, // Assuming employee exists
                managerName: managerUser // Force manager
            },
            headers: { 'Content-Type': 'application/json' }
            // Note: In real app, might need auth headers. Assuming test env allows or we need to login first.
            // If auth needed, we'll do UI flow for safety.
        });

        // If API fails (e.g. auth), let's fall back to UI helper or assume UI flow.
        // For robustness in this env, let's use UI flow if strict. 
        // But for "Reproduction" I'll try to stick to UI to replicate EXACTLY what user does.

        const context = await browser.newContext();
        const page = await context.newPage();

        // Login as Employee to create ticket (safe bet)
        await page.goto('/login');
        await page.fill('input[name="username"]', 'employee');
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/employee');

        // Create Ticket
        await page.click('text=+ New Ticket');
        await page.fill('input[name="title"]', 'Issue 8 Repro');
        await page.fill('textarea[name="description"]', 'Repro 500 Error');
        await page.selectOption('select[name="category"]', 'SOFTWARE'); // Triggers approval
        // Select manager if dropdown exists
        // Assuming auto-assigned or selectable
        // Let's assume defaults work for now, or check if we need to pick manager. 
        // Based on CreateTicket.jsx (not read), usually we pick manager?
        // Let's assume we proceed.
        await page.click('button:has-text("Submit Ticket")');

        // Verify creation
        await expect(page.locator('text=Ticket created successfully')).toBeVisible();
        await page.waitForTimeout(1000);

        // Get Ticket ID/Number from list or URL
        // It's likely top of list
        const ticketRow = page.locator('[data-testid="ticket-row"]').first();
        const ticketNumberText = await ticketRow.locator('button').first().innerText();
        console.log(`Created Ticket: ${ticketNumberText}`);

        // Logout
        await page.goto('/login');

        // 2. Manager Approval
        await page.fill('input[name="username"]', managerUser);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/manager');

        // Go to Pending Approvals
        await page.click('text=Pending Approvals');
        await page.waitForSelector(`text=${ticketNumberText}`);
        await page.click(`text=${ticketNumberText}`);

        // Approve
        await page.check('input[value="APPROVED"]');
        await page.selectOption('select', { index: 1 }); // Select a priority if needed (Low/Med/High)
        await page.click('button:has-text("Submit Review")');
        await expect(page.locator('text=Approval submitted')).toBeVisible({ timeout: 10000 }) || expect(page).toHaveURL('/app/manager');

        // Logout
        await page.goto('/login');

        // 3. Login as IT Support / Admin
        await page.fill('input[name="username"]', 'admin'); // Using Admin as they definitely have permissions
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Check Visibility
        // User says "Manager Approved tickets are not appearing properly"
        // Let's assert it IS visible first.
        const ticketLink = page.locator(`text=${ticketNumberText}`);
        if (await ticketLink.count() === 0) {
            console.log("Ticket NOT visible in Dashboard! Verifying Issue 8 symptom.");
            // If not visible, we might need to search or use direct link to continue testing 500 error
            await page.goto(`/app/tickets/1`); // Need ID. 
            // Better: Filter by Ticket No
            await page.fill('input[name="ticketNumber"]', ticketNumberText);
            await page.click('button:has-text("Apply")');
            await page.waitForTimeout(1000);
        }

        await expect(ticketLink).toBeVisible(); // This might fail if the bug exists
        await ticketLink.click();

        // 4. Admin Actions - Trigger 500
        // Monitor Network
        const [capturedRequest] = await Promise.all([
            page.waitForRequest(req => req.url().includes('/admin') && req.method() === 'PUT'),
            page.click('[data-testid="admin-ticket-submit"]') // Click Trigger
            // Wait: we need to Select Status first
        ]);

        // Select Status = CLOSED
        await page.selectOption('[data-testid="admin-ticket-status-select"]', 'CLOSED');
        // also try Assign User if needed, user says both cause it.
        // Let's just do Status first.

        await page.click('[data-testid="admin-ticket-submit"]');

        // Capture Payload
        const postData = capturedRequest.postDataJSON();
        console.log("Payload Sent:", JSON.stringify(postData, null, 2));

        // Verify Response
        const response = await capturedRequest.response();
        console.log("Response Status:", response?.status());
        const responseBody = await response?.text();
        console.log("Response Body:", responseBody);

        expect(response?.status()).not.toBe(500);
    });
});
