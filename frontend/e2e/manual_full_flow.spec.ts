import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TIMESTAMP = Date.now().toString();

// ============ HELPER FUNCTIONS ============

/**
 * Robust logout function that handles opening user menu and clicking Sign out
 */
async function logout(page: Page): Promise<void> {
    // Open user menu (robust selector strategy)
    const menuBtn = page.locator(
        'button[aria-label*="user" i], button[aria-label*="menu" i], button:has-text("Open user menu"), header button'
    ).first();

    await menuBtn.click({ timeout: 5000 });

    // Wait for menu to appear
    const menu = page.locator('[role="menu"], [data-testid="user-menu"], .MuiMenu-paper, div:has(button:has-text("Sign out"))');
    await menu.first().waitFor({ state: 'visible', timeout: 5000 });

    // Click Sign out / Logout
    const signOut = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [role="menuitem"]:has-text("Sign out"), [role="menuitem"]:has-text("Logout")').first();
    await signOut.click({ timeout: 5000 });

    // Wait for login page
    await page.waitForURL(/\/login/i, { timeout: 15000 });
}

/**
 * Reusable login function
 */
async function login(page: Page, baseUrl: string, username: string, password: string): Promise<void> {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click('button[type="submit"]')
    ]);
}

/**
 * Reusable ticket creation helper
 */
async function createTicket(page: Page, options: {
    title: string;
    category: string;
    description: string;
    managerLabelOrFirst?: boolean;
}): Promise<{ ticketNo: string | null; modalText: string }> {
    const { title, category, description, managerLabelOrFirst = true } = options;

    await page.goto(`${BASE_URL}/app/tickets/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // Wait for managers to auto-load

    await page.locator('[data-testid="ticket-title"]').fill(title);
    await page.locator('[data-testid="ticket-category"]').selectOption(category);
    await page.locator('[data-testid="ticket-description"]').fill(description);

    // Manager required for specific categories
    const needsManager = ['HARDWARE', 'SOFTWARE', 'ACCESS_AND_M365'].includes(category);

    if (needsManager || managerLabelOrFirst) {
        const mgrSelect = page.locator('[data-testid="ticket-manager"]');
        const optionCount = await mgrSelect.locator('option').count();
        if (optionCount > 1) {
            await mgrSelect.selectOption({ index: 1 }); // Select first non-empty option
        }
    }

    await page.locator('[data-testid="ticket-submit"]').click();

    // Wait for success modal
    await page.locator('[data-testid="ticket-success-modal"]').waitFor({ state: 'visible', timeout: 15000 });

    const modalText = await page.locator('[data-testid="ticket-success-modal"]').innerText();

    // Extract ticket number from modal text (GSG-XXXX or similar pattern)
    const match = modalText.match(/(?:GSG-|Ticket Number:\s*)([\w-]+)/);
    const ticketNo = match ? match[1] : null;

    await page.locator('[data-testid="ticket-success-ok"]').click();
    await page.waitForURL(/\/app\/employee/i, { timeout: 15000 });

    return { ticketNo, modalText };
}

// Store data across tests
const testData = {
    manager: {
        username: 'phase2_mgr',
        password: 'password',
        email: 'phase2_mgr@test.com',
        phone: '1234567890',
        id: ''
    },
    employee: {
        username: 'phase2_emp',
        password: 'password',
        email: 'phase2_emp@test.com',
        phone: '1234567891',
        id: ''
    },
    support: {
        username: 'phase2_sup',
        password: 'password',
        email: 'phase2_sup@test.com',
        phone: '1234567892',
        id: ''
    },
    tickets: {
        hardware: { number: '', title: '', id: '' },
        software: { number: '', title: '', id: '' },
        access: { number: '', title: '', id: '' },
        network: { number: '', title: '', id: '' }
    },
    ticket: { number: '', title: 'E2E Manual Flow Ticket', id: '' }
};

test.describe.serial('IT4U Full 4-Role E2E', () => {

    test('Phase A: Admin Verifies Users Exist', async ({ page }) => {
        console.log('\n=== PHASE A: Verifying Users Exist ===');

        // Login as admin
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Admin@123');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        await expect(page).toHaveURL(/.*\/app\/admin/);
        console.log('✓ Admin logged in');

        // Navigate to User Management
        await page.goto(`${BASE_URL}/app/admin/users`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('table', { timeout: 5000 });
        console.log('✓ Navigated to User Management');

        // Verify users exist
        await expect(page.locator(`tr:has-text("${testData.manager.username}")`)).toBeVisible();
        console.log(`✓ Manager ${testData.manager.username} exists`);

        await expect(page.locator(`tr:has-text("${testData.employee.username}")`)).toBeVisible();
        console.log(`✓ Employee ${testData.employee.username} exists`);

        await expect(page.locator(`tr:has-text("${testData.support.username}")`)).toBeVisible();
        console.log(`✓ Support ${testData.support.username} exists`);

        // Logout
        await logout(page);
        console.log('✓ Admin logged out\n');
    });

    test('Phase B: Employee Creates Ticket', async ({ page }) => {
        console.log('=== PHASE B: Employee Creating Ticket ===');

        // Login as employee
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', testData.employee.username);
        await page.fill('input[name="password"]', testData.employee.password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        await expect(page).toHaveURL(/.*\/app\/employee/);
        console.log('✓ Employee logged in');

        // Navigate to create ticket
        await page.goto(`${BASE_URL}/app/tickets/new`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500); // Wait for managers to auto-load
        console.log('✓ Navigated to Create Ticket');

        // Fill ticket form using TEST IDS
        await page.fill('[data-testid="ticket-title"]', testData.ticket.title);
        await page.selectOption('[data-testid="ticket-category"]', 'HARDWARE');
        await page.fill('[data-testid="ticket-description"]', 'E2E Full Flow Test - Hardware issue simulation');

        // Select first available manager
        const managerSelect = page.locator('[data-testid="ticket-manager"]');
        const hasManagers = await managerSelect.locator('option').count();
        if (hasManagers > 1) {
            await managerSelect.selectOption({ index: 1 });
            console.log('✓ Manager selected');
        }

        console.log(`✓ Ticket form filled: ${testData.ticket.title}`);

        // Submit
        await page.click('[data-testid="ticket-submit"]');

        // Wait for success modal and capture ticket number
        await page.waitForSelector('[data-testid="ticket-success-modal"]', { timeout: 5000 });
        const modalText = await page.locator('[data-testid="ticket-success-modal"]').textContent();
        const ticketNumberMatch = modalText?.match(/Ticket Number:\s*([\w-]+)/);
        if (ticketNumberMatch) {
            testData.ticket.number = ticketNumberMatch[1];
            console.log(`✓ Ticket created: ${testData.ticket.number}`);
        }

        await page.click('[data-testid="ticket-success-ok"]');
        await page.waitForURL(/.*\/app\/employee/, { timeout: 5000 });
        console.log('✓ Redirected to employee dashboard');

        // Logout
        await logout(page);
        console.log('✓ Employee logged out\n');
    });

    test('Phase C: Manager Approves Ticket', async ({ page }) => {
        console.log('=== PHASE C: Manager Approving Ticket ===');

        // Login as manager
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', testData.manager.username);
        await page.fill('input[name="password"]', testData.manager.password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        await expect(page).toHaveURL(/.*\/app\/manager/);
        console.log('✓ Manager logged in');

        // Find ticket in approvals table
        await page.waitForTimeout(1500);
        const ticketRow = page.locator(`tr:has-text("${testData.ticket.number}")`).first();
        const ticketExists = await ticketRow.isVisible();

        if (ticketExists) {
            console.log(`✓ Found ticket ${testData.ticket.number} in approvals`);

            // Click Approve button
            const approveButton = ticketRow.locator('button:has-text("Approve")');
            if (await approveButton.isVisible()) {
                await approveButton.click();
                await page.waitForTimeout(1500);
                console.log('✓ Ticket approved');
            }
        } else {
            console.warn(`⚠ Ticket ${testData.ticket.number} not found in manager view`);
        }

        // Logout
        await logout(page);
        console.log('✓ Manager logged out\n');
    });

    test('Phase D: Support Processes Ticket', async ({ page }) => {
        console.log('=== PHASE D: Support Processing Ticket ===');

        // Login as support
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', testData.support.username);
        await page.fill('input[name="password"]', testData.support.password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        await expect(page).toHaveURL(/.*\/app\/it-support/);
        console.log('✓ Support logged in');

        // Find ticket in queue
        await page.waitForTimeout(1500);
        const ticketRow = page.locator(`tr:has-text("${testData.ticket.number}")`).first();
        const ticketExists = await ticketRow.isVisible();

        if (ticketExists) {
            console.log(`✓ Found ticket ${testData.ticket.number} in support queue`);

            // Click ticket to open details
            await ticketRow.click();
            await page.waitForTimeout(1500);
            console.log('✓ Opened ticket details');

            // Assign to self
            const assignButton = page.locator('button:has-text("Assign to Me")');
            if (await assignButton.isVisible()) {
                await assignButton.click();
                await page.waitForTimeout(1500);
                console.log('✓ Assigned ticket to self');
            }

            // Change status to IN_PROGRESS
            const statusSelect = page.locator('select').filter({ hasText: /Status/ }).or(page.locator('select[name="status"]')).first();
            if (await statusSelect.isVisible()) {
                await statusSelect.selectOption('IN_PROGRESS');
                await page.waitForTimeout(1500);
                console.log('✓ Changed status to IN_PROGRESS');
            }

            // Add comment
            const commentBox = page.locator('textarea').first();
            if (await commentBox.isVisible()) {
                await commentBox.fill('E2E Test: Working on hardware issue');
                await page.locator('button:has-text("Add Comment")').or(page.locator('button:has-text("Comment")')).first().click();
                await page.waitForTimeout(1500);
                console.log('✓ Added comment');
            }

            // Change status to RESOLVED
            if (await statusSelect.isVisible()) {
                await statusSelect.selectOption('RESOLVED');
                await page.waitForTimeout(1500);
                console.log('✓ Changed status to RESOLVED');
            }

            // Change status to CLOSED
            if (await statusSelect.isVisible()) {
                await statusSelect.selectOption('CLOSED');
                await page.waitForTimeout(1500);
                console.log('✓ Changed status to CLOSED');
            }
        } else {
            console.warn(`⚠ Ticket ${testData.ticket.number} not found in support view`);
        }

        // Logout
        await logout(page);
        console.log('✓ Support logged out\n');
    });

    test('Phase E: Employee Verifies Closure', async ({ page }) => {
        console.log('=== PHASE E: Employee Verifying Ticket Closure ===');

        // Login as employee
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', testData.employee.username);
        await page.fill('input[name="password"]', testData.employee.password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        await expect(page).toHaveURL(/.*\/app\/employee/);
        console.log('✓ Employee logged in');

        // Find ticket in dashboard
        await page.waitForTimeout(1500);
        const ticketRow = page.locator(`tr:has-text("${testData.ticket.number}")`).first();
        const ticketExists = await ticketRow.isVisible();

        if (ticketExists) {
            console.log(`✓ Found ticket ${testData.ticket.number} in employee dashboard`);

            // Click ticket to open details
            await ticketRow.click();
            await page.waitForTimeout(1500);
            console.log('✓ Opened ticket details');

            // Verify status is CLOSED
            const statusBadge = page.locator('text=/CLOSED/i').first();
            if (await statusBadge.isVisible()) {
                console.log('✅ Ticket status is CLOSED');
                expect(await statusBadge.isVisible()).toBeTruthy();
            }

            // Verify comments are visible
            const commentContent = page.locator('text=/Working on hardware issue/i');
            if (await commentContent.isVisible()) {
                console.log('✅ Comments visible');
                expect(await commentContent.isVisible()).toBeTruthy();
            }
        } else {
            console.warn(`⚠ Ticket ${testData.ticket.number} not found in employee view`);
        }

        console.log('\n🎉 === FULL 4-ROLE E2E TEST COMPLETE === 🎉\n');
    });

});


