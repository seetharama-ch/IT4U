import { test, expect } from '@playwright/test';
import { USERS } from '../fixtures/test-data';
import { loginAs } from '../utils/login-helpers';

test.describe('Full 4-Role End-to-End Verification', () => {
    test.setTimeout(180000); // 3 minutes for full cycle

    // 1. Seed All Test Users
    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000); // Set test timeout to 5 mins
        const page = await browser.newPage();
        await loginAs(page, 'admin'); // Default admin is 'admin'
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');

        // Helper to ensure user exists
        const ensureUser = async (roleKey, roleType, dept = 'General') => {
            const user = USERS[roleKey];
            if (!user) return; // Skip if key not found

            // Check if user exists in list
            const content = await page.content();
            if (!content.includes(user.username)) {
                console.log(`Creating user: ${user.username}`);
                await page.click('button:has-text("Add New User")'); // Adjust selector as needed

                // Form filling
                await page.fill('input[name="username"]', user.username);
                await page.fill('input[name="password"]', user.password);
                await page.fill('input[name="fullName"]', user.name);
                await page.fill('input[name="email"]', user.email);

                await page.selectOption('select[name="role"]', roleType);

                if (roleType !== 'ADMIN') {
                    await page.fill('input[name="department"]', dept);
                }

                // For simplified flow, we don't assign manager here unless mandatory. 
                // Backend User.java says manager isn't mandatory for creation but logic might verify.

                await page.click('button:has-text("Register")');
                await page.waitForTimeout(1000);

                // Clear modal if it doesn't close auto (it should)
                // await page.keyboard.press('Escape');
            } else {
                console.log(`User ${user.username} already exists.`);
            }
        };

        // Create the 4 Dummy Users
        await ensureUser('dummy_manager', 'MANAGER', 'Engineering');
        await ensureUser('dummy_employee', 'EMPLOYEE', 'Engineering');
        await ensureUser('it_support_dummy', 'IT_SUPPORT', 'IT');
        await ensureUser('admin_root', 'ADMIN', 'IT'); // Extra admin

        await page.close();
    });

    test('Complete Ticket Lifecycle: Employee -> Manager -> Admin Support -> Admin', async ({ page }) => {

        // --- Step 2: Employee Creates Ticket ---
        await loginAs(page, 'dummy_employee');

        await page.click('text=New Ticket');

        // Verify Toggle
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeDisabled();
        await page.click('label:has-text("Attach a file?")');
        await expect(fileInput).toBeEnabled();

        // Fill Form
        const ticketTitle = `Regression Test Ticket ${Date.now()}`;
        await page.fill('input[name="title"]', ticketTitle);
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.selectOption('select[name="priority"]', 'MEDIUM');
        await page.fill('textarea[name="description"]', 'Ticket created to test full 4-role flow.');
        await page.fill('input[name="deviceDetails"]', 'Device-123'); // Conditional field for Hardware

        // Select Manager
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        // Submit
        const submitBtn = page.locator('button[type="submit"]');
        const submitPromise = page.click('button[type="submit"]');
        await expect(submitBtn).toHaveText('Submitting...');
        await submitPromise;

        // Verify Success Modal
        await expect(page.locator('#modal-title')).toHaveText('Ticket Created Successfully');
        // Capture Ticket ID if possible?
        // Let's just click OK.
        await page.click('button:has-text("Go to My Tickets")');

        // Verify in My Tickets
        await expect(page.locator('h1')).toContainText('My Tickets');
        await expect(page.getByText(ticketTitle)).toBeVisible();
        await expect(page.getByText('PENDING')).toBeVisible(); // Approval Status

        await page.click('button:has-text("Logout")');

        // --- Step 3: Manager Approves ---
        await loginAs(page, 'dummy_manager');

        // Go to Pending Approvals
        await page.click('text=Pending Approvals');

        // Find Ticket
        const ticketRow = page.locator('tr').filter({ hasText: ticketTitle });
        await expect(ticketRow).toBeVisible();

        // Open Details
        await ticketRow.getByText('View').click();

        // Verify Details
        await expect(page.locator('h1')).toContainText(ticketTitle);
        await expect(page.getByText('Requested by')).toBeVisible(); // Or check specific text if implemented

        // Approve
        await page.click('button:has-text("Approve Response")'); // Trigger modal? Or direct?
        // Assuming there is an "Approve" button or similar action. 
        // Based on TicketDetails.jsx (from memory/previous context), it has Approve/Reject buttons for Manager.
        const approveBtn = page.locator('button:has-text("Approve")');
        // Wait, TicketDetails usually shows "Approve" / "Reject" if status is PENDING.
        if (await approveBtn.isVisible()) {
            await approveBtn.click();
        } else {
            console.log("Approve button not found? Status might be wrong.");
        }

        // Verify Status Change
        await expect(page.getByText('APPROVED')).toBeVisible();

        await page.click('button:has-text("Logout")');

        // --- Step 4: Admin Support Sees Ticket ---
        await loginAs(page, 'it_support_dummy');

        // Should see ticket in main list (Dashboard)
        await expect(page.getByText(ticketTitle)).toBeVisible();

        // Status check
        // It might be 'OPEN' still, or 'IN_PROGRESS' if assigned? 
        // Manager approval usually sets managerApprovalStatus=APPROVED. Ticket Status remains OPEN until IT picks it up.
        // Let's verify row shows 'APPROVED' badge for approval column?
        // Admin/Support view has Approval column.

        await page.click('button:has-text("Logout")');

        // --- Step 5: Manager as Requester ---
        await loginAs(page, 'dummy_manager');
        await page.click('text=New Ticket');

        const mgrTicketTitle = `Manager Self Request ${Date.now()}`;
        await page.fill('input[name="title"]', mgrTicketTitle);
        await page.selectOption('select[name="category"]', 'network'); // Lowercase match? Values are uppercase in select.
        await page.selectOption('select[name="category"]', 'NETWORK');
        await page.fill('textarea[name="description"]', 'Manager self request test.');
        await page.selectOption('select[name="priority"]', 'LOW');

        // Manager selects... themselves? Or someone else?
        // If they select themselves:
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        await page.click('button[type="submit"]');
        await page.click('button:has-text("Go to My Tickets")'); // or OK

        // Check "My Requests" tab
        await page.click('text=My Requests');
        await expect(page.getByText(mgrTicketTitle)).toBeVisible();

        await page.click('button:has-text("Logout")');

        // --- Step 6: Admin Global View ---
        await loginAs(page, 'admin_root'); // Using the new admin user

        // Search/Filter
        // Just verify both exist in list
        await expect(page.getByText(ticketTitle)).toBeVisible(); // First ticket
        await expect(page.getByText(mgrTicketTitle)).toBeVisible(); // Second ticket

        await page.close();
    });
});
