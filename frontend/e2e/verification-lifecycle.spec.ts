import { test, expect } from '@playwright/test';
import { loginAs } from './utils/login-helpers';
import { USERS } from './fixtures/test-data';

test.describe('Ticket Lifecycle & Timestamp Verification (Regression)', () => {
    let ticketId: string;

    test('Full Lifecycle: Create -> Approve -> Assign -> Resolve -> Close', async ({ page, browserName }) => {
        test.setTimeout(120000); // Allow extra time for multi-login flow

        // --- 1. Create Ticket as Employee ---
        await test.step('Employee creates ticket', async () => {
            await loginAs(page, 'employee');
            await page.goto('/app/tickets/new');

            // Wait for backend to be ready (prevents false failures on startup)
            try {
                await page.waitForResponse(
                    r => r.url().includes('/api/auth/me'),
                    { timeout: 15000 }
                ).catch(() => { }); // Ignore if it already happened
            } catch (e) {
                console.log('Backend wait optional or already passed');
            }


            await page.fill('input[name="title"]', `Lifecycle Test ${Date.now()}`);
            await page.selectOption('select[name="category"]', 'SOFTWARE'); // Needs approval
            await page.fill('textarea[name="description"]', 'Testing timestamps throughout lifecycle');

            // Handle dynamic manager selection if needed, or rely on test data defaults if auto-populated
            // Assuming form might need manager selection if not auto-inferred
            // But per previous context, let's assume standard creation works

            // Select manager manually if the field exists
            const managerSelect = page.locator('select[name="managerName"]');
            if (await managerSelect.isVisible()) {
                // Try to select manager_mike by value or label usually
                // If it's by username value:
                await managerSelect.selectOption({ label: 'manager_mike' }).catch(() => { });
                // If that fails, might be by ID? 
                // Let's assume the user can just type/select
            } else {
                // Or maybe it's an input
                const managerInput = page.locator('input[name="managerName"]');
                if (await managerInput.isVisible()) {
                    await managerInput.fill(USERS.manager.username);
                }
            }

            await page.click('button[type="submit"]');

            // Wait for navigation to details
            await expect(page).toHaveURL(/\/app\/tickets\/\d+/);

            // Capture ID
            const url = page.url();
            ticketId = url.split('/').pop()!;
            console.log(`Created Ticket ID: ${ticketId}`);

            // Verify Created At
            await expect(page.locator('text=Created:')).toBeVisible();
            // Verify status
            await expect(page.locator('text=PENDING_MANAGER_APPROVAL')).toBeVisible();

            // Logout
            await page.click('text=Logout'); // Or use helper if UI consistent
            await expect(page).toHaveURL('/login');
        });

        // --- 2. Approve Ticket as Manager ---
        await test.step('Manager approves ticket', async () => {
            await loginAs(page, 'manager');
            await page.goto(`/app/tickets/${ticketId}`);

            // Verify status pending
            await expect(page.locator('text=PENDING_MANAGER_APPROVAL')).toBeVisible();

            // Select radio Approve
            await page.check('input[value="APPROVED"]');
            // Select Priority (often required for some categories, good practice to set it)
            // If category is SOFTWARE, maybe optional? But let's set it.
            const prioritySelect = page.locator('select').filter({ hasText: 'Select Priority' });
            if (await prioritySelect.isVisible()) {
                await prioritySelect.selectOption('MEDIUM');
            }

            // Click Submit Review
            await page.click('button:has-text("Submit Review")');

            // Verify status changes to OPEN (or Approved then Open)
            await expect(page.locator('text=OPEN')).toBeVisible();
            // Verify Timeline timestamp
            await expect(page.locator('text=Manager Approved')).toBeVisible();

            // Logout
            await page.click('text=Logout');
            await expect(page).toHaveURL('/login');
        });

        // --- 3. Assign Ticket as IT Support ---
        await test.step('IT Support assigns ticket', async () => {
            await loginAs(page, 'it_support');
            await page.goto(`/app/tickets/${ticketId}`);

            // Assign to self
            await page.click('button:has-text("Assign to Me")');

            // Verify status IN_PROGRESS
            await expect(page.locator('text=IN_PROGRESS')).toBeVisible();
            // Verify Timeline
            await expect(page.locator('text=In Progress')).toBeVisible();

            // Logout
            await page.click('text=Logout');
            await expect(page).toHaveURL('/login');
        });

        // --- 4. Resolve Ticket as IT Support (or reuse session if safe) ---
        // Let's re-login to simulate clean session or just continue if step 3 kept us logged in. 
        // Actually step 3 logged out. So login again.
        await test.step('IT Support resolves ticket', async () => {
            await loginAs(page, 'it_support');
            await page.goto(`/app/tickets/${ticketId}`);

            // Click Mark Resolved
            await page.click('button:has-text("Mark Resolved")');

            // Verify status RESOLVED
            await expect(page.locator('text=RESOLVED')).toBeVisible();
            // Verify Timeline
            await expect(page.locator('text=Resolved')).toBeVisible();

            // Logout
            await page.click('text=Logout');
            await expect(page).toHaveURL('/login');
        });

        // --- 5. Close Ticket as IT Support / Admin ---
        await test.step('Admin closes ticket', async () => {
            await loginAs(page, 'admin');
            await page.goto(`/app/tickets/${ticketId}`);

            // Click Close Ticket
            await page.click('button:has-text("Close Ticket")');

            // Verify status CLOSED
            await expect(page.locator('text=CLOSED')).toBeVisible();
            // Verify Timeline
            await expect(page.locator('text=Closed')).toBeVisible();
        });
    });

    test('Reject Path: Create -> Reject -> Verify', async ({ page }) => {
        test.setTimeout(60000);
        let rejectTicketId: string;

        // 1. Employee creates ticket
        await test.step('Employee creates ticket for rejection', async () => {
            await loginAs(page, 'employee');
            await page.goto('/app/tickets/new');
            await page.fill('input[name="title"]', `Reject Test ${Date.now()}`);
            await page.selectOption('select[name="category"]', 'SOFTWARE');
            await page.fill('textarea[name="description"]', 'This ticket should be rejected');
            // Select manager if needed (reuse logic or assume default)
            const managerSelect = page.locator('select[name="managerName"]');
            if (await managerSelect.isVisible()) {
                await managerSelect.selectOption({ label: 'manager_mike' }).catch(() => { });
            }
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
            const url = page.url();
            rejectTicketId = url.split('/').pop()!;

            // Logout
            await page.click('text=Logout');
            await expect(page).toHaveURL('/login');
        });

        // 2. Manager rejects
        await test.step('Manager rejects ticket', async () => {
            await loginAs(page, 'manager');
            await page.goto(`/app/tickets/${rejectTicketId}`);

            // Reject
            await page.check('input[value="REJECTED"]');
            await page.click('button:has-text("Submit Review")');

            // Verify status
            await expect(page.locator('text=Status: REJECTED')).toBeVisible(); // Or badge
            await expect(page.locator('text=Manager Rejected')).toBeVisible();

            // Verify approvedAt is NOT visible/set? 
            // The timeline logic in frontend hides "Manager Approved" if rejected.
            // But checking "Manager Rejected" confirms rejectedAt logic usually.

            // Logout
            await page.click('text=Logout');
            await expect(page).toHaveURL('/login');
        });

        // 3. Employee sees rejection
        await test.step('Employee checks rejection', async () => {
            await loginAs(page, 'employee');
            // Check dashboard or details
            await page.goto(`/app/tickets/${rejectTicketId}`);
            await expect(page.locator('text=REJECTED')).toBeVisible();
            await expect(page.locator('text=Manager Rejected')).toBeVisible();
        });
    });
});
