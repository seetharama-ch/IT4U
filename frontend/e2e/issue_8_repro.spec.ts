
import { test, expect } from '@playwright/test';

test.describe('ISSUE-8: Admin & IT Support Dashboard 500 Error Reproduction', () => {
    test.use({ baseURL: 'http://localhost:5173' });

    // Unique timestamps to ensure fresh users for each run
    const timestamp = Date.now();
    // Use pre-created users from setup_e2e_users.ps1
    const adminUser = { username: 'admin', password: 'admin123' };
    const empUser = { username: 'employee_e2e_20251225', password: 'E2E@12345', role: 'EMPLOYEE' };
    const mgrUser = { username: 'manager_e2e_20251225', password: 'E2E@12345', role: 'MANAGER' };
    const itsUser = { username: 'support_e2e_20251225', password: 'E2E@12345', role: 'IT_SUPPORT' };

    let ticketId: string;
    let ticketNumber: string;

    test('Full Lifecycle: Create Users -> Employee Ticket -> Manager Approve -> IT Support Assign/Close (should not 500)', async ({ browser, request }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Step 1: Skipped (Users created via API script)');
        // Users are already created, so we jump to Step 2

        // --- Step 2: Employee Creates Ticket ---
        console.log('Step 2: Employee creating ticket...');
        await page.goto('/login');
        await page.fill('input[name="username"]', empUser.username);
        await page.fill('input[name="password"]', empUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/employee');

        await page.goto('/app/tickets/new');
        await page.fill('input[name="title"]', `Issue 8 Ticket ${timestamp}`);
        await page.fill('textarea[name="description"]', 'Testing 500 error on status change');
        await page.selectOption('select[name="category"]', 'SOFTWARE'); // Logic says this triggers approval

        // If Manager selection is required/available:
        // We need to select our specific manager
        // Wait for manager select to be populated (it loads async)
        await expect(page.locator('select[name="managerSelect"] option').nth(1)).toBeAttached({ timeout: 10000 });

        // Debug: Log all options
        const options = await page.locator('select[name="managerSelect"] option').allTextContents();
        console.log('Available Manager Options:', options);

        // Try to find matching option
        // We will select by label that includes the username (handling space/underscore diffs)
        const usernameParts = mgrUser.username.split('_');
        // Match if all parts are present in the option (case-insensitive?)
        const optionToSelect = options.find(opt => {
            // Simple check: 'manager e2e 20251225' vs 'manager_e2e_20251225'
            return opt.replace(/ /g, '_').includes(mgrUser.username) || opt.includes(mgrUser.username);
        });
        if (!optionToSelect) {
            throw new Error(`Manager ${mgrUser.username} not found in options: ${options.join(', ')}`);
        }

        await page.selectOption('select[name="managerSelect"]', { label: optionToSelect });

        // Submit
        await page.click('button[data-testid="ticket-submit"]');

        // Success Modal
        await expect(page.locator('[data-testid="ticket-success-modal"]')).toBeVisible();
        // Get Ticket Number from modal text
        const successMsg = await page.textContent('[data-testid="ticket-success-modal"]') || '';
        // Extract "Ticket Number: TICKET-123"
        const match = successMsg.match(/Ticket Number:\s*(GSG-\d+)/);
        if (match) {
            ticketNumber = match[1];
            console.log('Created Ticket:', ticketNumber);
        } else {
            // Fallback if modal text is different
            console.log('Could not extract ticket number from modal, looking at list...');
        }

        await page.click('[data-testid="ticket-success-ok"]');
        await expect(page.locator('[data-testid="ticket-success-modal"]')).toBeHidden();

        // Robust Logout: Try navigating to login, if redirected, use logout
        await page.goto('/login');
        await page.waitForTimeout(1000); // Wait for redirect if any
        console.log('After goto /login, URL is:', page.url());

        if (page.url().includes('app')) {
            console.log('Redirected to app, clicking Logout...');
            // Logout requires opening profile menu
            await page.click('[data-testid="user-menu"]');
            await page.click('[data-testid="logout-btn"]');

            // Wait for login page
            await expect(page).toHaveURL(/\/login/);
            console.log('Logged out successfully.');
        }

        // --- Step 3: Manager Approves Ticket (Scenario-1) ---
        console.log('Step 3: Manager approving ticket...');
        await page.goto('/login');
        await page.fill('input[name="username"]', mgrUser.username);
        await page.fill('input[name="password"]', mgrUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/manager');

        // Ensure we are on the dashboard
        await expect(page).toHaveURL('/app/manager');

        // Reload to ensure list is fresh
        await page.reload();
        await page.waitForTimeout(2000);

        await page.click('text=Pending Approvals');

        // Wait for ticket to appear
        console.log(`Waiting for ticket ${ticketNumber} to appear in Pending Approvals...`);
        try {
            // Use .first() to avoid strict mode if multiple elements match (e.g. #ID and ID button)
            await expect(page.locator(`text=${ticketNumber}`).first()).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log('Ticket not found. Page content:', await page.textContent('body'));
            throw e;
        }

        await page.locator(`text=${ticketNumber}`).first().click();

        // Approve
        await page.check('input[value="APPROVED"]'); // Radio button
        await page.selectOption('select', { index: 1 }); // Priority: Low/Med/High
        await page.fill('textarea', 'Approved for testing'); // Comment
        await page.click('button:has-text("Submit Review")');

        // Wait for success
        // Assert ticket status becomes APPROVED (or similar verification)
        await expect(page.locator('text=Current Status: APPROVED').or(page.locator('text=Ticket Approved'))).toBeVisible();

        // Close modal if present
        if (await page.locator('text=Card Approved').isVisible() || await page.locator('text=Ticket Approved').isVisible()) {
            // Only click if it's the modal OK button
            const okBtn = page.locator('button:has-text("OK")');
            if (await okBtn.isVisible()) {
                await okBtn.click();
            }
        }

        // Robust Logout: Try navigating to login, if redirected, use logout
        await page.waitForTimeout(1000); // Give time for any transitions
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        if (page.url().includes('app')) {
            console.log('Redirected to app, clicking Logout...');
            // Try specific logout button or menu
            if (await page.locator('[data-testid="user-menu"]').isVisible()) {
                await page.click('[data-testid="user-menu"]');
                await page.click('[data-testid="logout-btn"]');
            } else if (await page.locator('text=Logout').isVisible()) {
                await page.click('text=Logout');
            }
            await expect(page).toHaveURL(/\/login/);
            console.log('Logged out successfully from Step 3.');
        }

        // --- Step 4: IT Support - Assign and Close (This should trigger 500) ---
        console.log('Step 4: IT Support processing ticket...');
        await page.goto('/login');

        // Wait to see if we get redirected to app (active session)
        try {
            await expect(page).toHaveURL(/.*\/app\/.*/, { timeout: 3000 });
            console.log('Detected active session in Step 4, logging out...');
            if (await page.locator('[data-testid="user-menu"]').isVisible()) {
                await page.click('[data-testid="user-menu"]');
                await page.click('[data-testid="logout-btn"]');
            } else {
                await page.click('text=Logout');
            }
            await expect(page).toHaveURL(/\/login/);
        } catch (e) {
            // If timeout, we are likely on login page or loading it
        }

        await expect(page.locator('input[name="username"]')).toBeVisible();
        await page.fill('input[name="username"]', itsUser.username);
        await page.fill('input[name="password"]', itsUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/app/it-support');

        // Find the approved ticket
        // It might be in a list; filtering might be needed if many tickets exist
        // But since we just created it and users are fresh, it should be top or easily found.
        const ticketVisible = await page.isVisible(`text=${ticketNumber}`);
        if (!ticketVisible) {
            // Maybe switch tabs or filter?
            // Assuming default view shows it.
            throw new Error(`Ticket ${ticketNumber} not visible in IT Support Dashboard`);
        }
        await page.click(`text=${ticketNumber}`);

        // Actions Panel - This is where the 500 expects to happen

        // Intercept Network to capture failure
        const statusRequestPromise = page.waitForRequest(req =>
            req.url().includes('/admin') && // Actions seem to use /api/tickets/{id}/admin
            req.method() === 'PUT'
        );

        // A) Assign to Self (optional per repro steps but good to do)
        // Check if "Assign to Me" button exists or select from dropdown
        // The TicketDetails.jsx has "Assign to Me" button if not assigned
        if (await page.isVisible('button:has-text("Assign to Me")')) {
            await page.click('button:has-text("Assign to Me")');
            // This might reload the page or update state. 
            // Wait for update?
            await page.waitForTimeout(1000);
        }

        // B) Change Status to CLOSED
        // Select "Closed" from dropdown
        await page.selectOption('[data-testid="admin-ticket-status-select"]', 'CLOSED'); // Using testid seen in file view

        console.log('Submitting status change...');
        // Click Submit
        await page.click('[data-testid="admin-ticket-submit"]');

        const requestObj = await statusRequestPromise;
        const postData = requestObj.postDataJSON();
        console.log('Captured Request Payload:', JSON.stringify(postData, null, 2));

        const response = await requestObj.response();
        const status = response?.status();
        const body = await response?.text();

        console.log(`Response Status: ${status}`);
        console.log(`Response Body: ${body}`);

        expect(status).not.toBe(500);
        expect(status).toBe(200);

        // Verify UI update
        // Should show CLOSED status in badge
        await expect(page.locator('span:has-text("CLOSED")')).toBeVisible();
    });
});
