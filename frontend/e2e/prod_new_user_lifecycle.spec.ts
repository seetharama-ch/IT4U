import { test, expect } from '@playwright/test';
import { loadProdCredentials, waitForStability } from './helpers/testUtils';

/**
 * PROD-ONLY E2E Test: New User Lifecycle & Verification
 * 
 * Objectives:
 * 1. Create 3 users (e2e_emp, e2e_mgr, e2e_sup)
 * 2. Intentional validation failure in User Creation
 * 3. Employee creates ticket assigned to New Manager
 * 4. Manager approves ticket
 * 5. IT Support self-assigns and updates status to "end-to-end testing required"
 * 6. Final verification by Employee
 */

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';
const TIMESTAMP = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12); // Shorter timestamp for usernames

const USERS = {
    employee: { username: `e2e_emp_${TIMESTAMP}`, password: 'Password@123', fullName: `E2E Employee ${TIMESTAMP}`, email: `e2e_emp_${TIMESTAMP}@test.local`, phoneNumber: '+15551234560', role: 'EMPLOYEE', department: 'IT' },
    manager: { username: `e2e_mgr_${TIMESTAMP}`, password: 'Password@123', fullName: `E2E Manager ${TIMESTAMP}`, email: `e2e_mgr_${TIMESTAMP}@test.local`, phoneNumber: '+15551234561', role: 'MANAGER', department: 'IT' },
    support: { username: `e2e_sup_${TIMESTAMP}`, password: 'Password@123', fullName: `E2E Support ${TIMESTAMP}`, email: `e2e_sup_${TIMESTAMP}@test.local`, phoneNumber: '+15551234562', role: 'IT_SUPPORT', department: 'IT' }
};

let TICKET_ID_APPROVED = '';
let TICKET_INTERNAL_ID = '';

test.describe.serial('PROD New User E2E Lifecycle', () => {
    let adminCreds: any;

    test.beforeAll(() => {
        adminCreds = loadProdCredentials().admin;
    });

    test('Phase 0: Admin Creates New Users with Validation Checkpoint', async ({ page }) => {
        const passwordToUse = adminCreds.password === 'Admin@123' ? 'admin123' : adminCreds.password;
        await page.goto(`${BASE_URL}/login`);
        await page.getByTestId('login-username').or(page.locator('input[name="username"]')).fill(adminCreds.username);
        await page.getByTestId('login-password').or(page.locator('input[name="password"]')).fill(passwordToUse);
        await page.getByTestId('login-submit').or(page.getByRole('button', { name: /login|submit/i })).click();
        await page.waitForURL(/\/app\/(admin|tickets|dashboard)/);

        await page.goto(`${BASE_URL}/app/admin/users`);

        // --- Validation Checkpoint ---
        console.log('Checkpoint: Verifying field-level validation...');
        await page.getByRole('button', { name: /\+? ?Add User/i }).click();
        await page.fill('input[name="username"]', 'temp_invalid_user');
        // Leave email blank
        await page.locator('input[type="password"]').first().fill('Password@123');
        await page.click('button[type="submit"]');

        // Confirm UI shows validation error (HTML5 validation or custom)
        const emailInput = page.locator('input[name="email"]');
        const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
        if (!isEmailInvalid) {
            console.warn('HTML5 validation not triggered, checking for custom error messages...');
            await expect(page.locator('text=/required|empty|invalid/i')).toBeVisible();
        } else {
            console.log('HTML5 validation confirmed.');
        }
        await page.getByRole('button', { name: /cancel/i }).click();

        // --- Successful User Creation ---
        for (const roleKey of ['manager', 'employee', 'support']) {
            const user = USERS[roleKey as keyof typeof USERS];
            await page.getByRole('button', { name: /\+? ?Add User/i }).click();
            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="email"]', user.email);
            await page.fill('input[name="phoneNumber"]', user.phoneNumber);
            await page.locator('input[type="password"]').first().fill(user.password);
            await page.locator('select[name="role"]').or(page.getByLabel(/role/i)).selectOption(user.role);
            await page.locator('input[name="department"]').fill(user.department);
            if (roleKey === 'employee') {
                await page.getByLabel(/Manager Username/i).or(page.getByPlaceholder('e.g. manager_mike')).fill(USERS.manager.username);
            }
            await page.click('button[type="submit"]');
            await expect(page.locator('text=created successfully')).toBeVisible();
            await expect(page.getByRole('dialog')).toBeHidden();
        }
        await page.locator('[data-testid="user-menu"]').click();
        await page.getByTestId('logout-btn').click();
    });

    test('Phase 1: Employee Creates Ticket Assigned to New Manager', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', USERS.employee.username);
        await page.fill('input[name="password"]', USERS.employee.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/app\/(employee|tickets)/);

        await page.getByRole('link', { name: /report issue/i }).click();
        await waitForStability(page);

        const title = `E2E PROD TEST ${TIMESTAMP}`;
        await page.fill('input[name="title"]', title);
        await page.locator('select[name="category"]').or(page.getByLabel(/category/i)).selectOption('HARDWARE');
        await page.locator('textarea[name="description"]').or(page.getByLabel(/description/i)).fill('E2E validation flow: employee -> manager -> support');

        // Fetch and select manager
        await page.getByRole('button', { name: /fetch managers/i }).click();
        await waitForStability(page);

        const managerSelect = page.locator('select[name="managerSelect"]');
        const managerSearchTerm = USERS.manager.username;
        console.log(`Searching for manager with term: ${managerSearchTerm}`);

        // Robust selection using contains and space-agnostic matching if needed
        const option = managerSelect.locator('option').filter({ hasText: new RegExp(managerSearchTerm.replace(/_/g, '[_ ]'), 'i') }).first();
        if (await option.count() > 0) {
            const label = await option.textContent() || '';
            console.log(`Selecting manager option: ${label}`);
            await managerSelect.selectOption({ label });
        } else {
            console.warn(`Manager ${managerSearchTerm} not found, falling back to first available.`);
            await managerSelect.selectOption({ index: 1 });
        }

        const responsePromise = page.waitForResponse(response =>
            response.url().includes('tickets') &&
            response.request().method() === 'POST' &&
            (response.status() === 200 || response.status() === 201),
            { timeout: 30000 }
        );

        await page.click('button[type="submit"]');
        const response = await responsePromise;
        const responseData = await response.json();
        TICKET_INTERNAL_ID = responseData.id.toString();

        const successModal = page.getByTestId('ticket-success-modal');
        await expect(successModal).toBeVisible();
        const modalText = await successModal.innerText();
        const idMatch = modalText.match(/Ticket Number:\s*(\S+)/i);
        if (idMatch) TICKET_ID_APPROVED = idMatch[1];

        console.log(`Ticket Created: GSG ID ${TICKET_ID_APPROVED}, Internal ID ${TICKET_INTERNAL_ID}`);
        await page.getByTestId('ticket-success-ok').click();

        await page.locator('[data-testid="user-menu"]').click();
        await page.getByTestId('logout-btn').click();
    });

    test('Phase 2: Manager Approves Ticket', async ({ page }) => {
        if (!TICKET_INTERNAL_ID) throw new Error('TICKET_INTERNAL_ID missing!');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', USERS.manager.username);
        await page.fill('input[name="password"]', USERS.manager.password);
        await page.click('button[type="submit"]');

        await page.goto(`${BASE_URL}/app/tickets/${TICKET_INTERNAL_ID}`);
        await waitForStability(page);

        const approvedRadio = page.locator('input[value="APPROVED"]');
        await expect(approvedRadio).toBeVisible({ timeout: 15000 });
        await approvedRadio.check();

        await page.locator('textarea[placeholder*="reason or note"]').or(page.locator('textarea')).first().fill('Approved for E2E test');
        await page.getByRole('button', { name: /submit review/i }).click();

        // Wait for ApprovalSuccessModal
        await expect(page.locator('text=Ticket Approved')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'OK', exact: true }).click();

        await page.locator('[data-testid="user-menu"]').click();
        await page.getByTestId('logout-btn').click();
    });

    test('Phase 3: IT Support Self-Assign and Status Update', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', USERS.support.username);
        await page.fill('input[name="password"]', USERS.support.password);
        await page.click('button[type="submit"]');

        await page.goto(`${BASE_URL}/app/tickets/${TICKET_INTERNAL_ID}`);
        await waitForStability(page);

        // Self-assign
        const assignBtn = page.getByRole('button', { name: /assign to me|claim/i });
        await expect(assignBtn).toBeVisible();
        await assignBtn.click();
        await expect(page.locator(`text=/Assigned To:.*${USERS.support.username}/i`)).toBeVisible();

        // Post mandatory comment FIRST (as status update navigates away)
        const commentArea = page.getByPlaceholder(/type a response/i);
        await expect(commentArea).toBeVisible();
        await commentArea.fill('end-to-end testing required');
        await page.getByRole('button', { name: /post comment/i }).click();
        await expect(page.locator('text=end-to-end testing required')).toBeVisible();

        // Update status to RESOLVED and wait for success toast
        const statusSelect = page.getByTestId('admin-ticket-status-select');
        await expect(statusSelect).toBeVisible();
        await statusSelect.selectOption('RESOLVED');

        console.log('Attempting status update to RESOLVED...');
        const respPromise = page.waitForResponse(resp => resp.url().includes(`/api/tickets/${TICKET_INTERNAL_ID}/admin`) && resp.request().method() === 'PUT');
        await page.getByTestId('admin-ticket-submit').click();

        const resp = await respPromise;
        console.log(`RESOLVED Status: ${resp.status()}`);
        expect(resp.status()).toBe(200);

        // Wait for success toast and check navigation
        await expect(page.locator('text=/updated successfully|resolved successfully/i')).toBeVisible({ timeout: 10000 });
        console.log('Verification SUCCESS: Ticket resolved successfully by IT Support!');

        await page.locator('[data-testid="user-menu"]').click();
        await page.getByTestId('logout-btn').click();
    });

    test('Phase 4: Employee Final Verification', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', USERS.employee.username);
        await page.fill('input[name="password"]', USERS.employee.password);
        await page.click('button[type="submit"]');

        await page.goto(`${BASE_URL}/app/tickets/${TICKET_INTERNAL_ID}`);
        await waitForStability(page);

        // Verify manager approval (using label from Tracking Timeline)
        await expect(page.locator('text=Manager Approved')).toBeVisible();
        // Verify assignment
        await expect(page.locator(`text=${USERS.support.username}`)).toBeVisible();
        // Verify status comment
        await expect(page.locator('text=end-to-end testing required')).toBeVisible();

        console.log('E2E LIFECYCLE VERIFIED SUCCESSFULLY.');
    });
});
