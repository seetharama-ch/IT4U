import { test, expect } from '@playwright/test';
import { USERS } from '../fixtures/test-data';
import { loginAs, logout } from '../utils/login-helpers';

test.describe.configure({ mode: 'serial' });

test.describe('Regression Fixes Suite (v1.2)', () => {
    let ticketTitle: string;

    test.beforeAll(async ({ browser }) => {
        ticketTitle = `Regress Fix ${Date.now()}`;

        const context = await browser.newContext();
        const page = await context.newPage();

        // Login as Admin to fix data
        await loginAs(page, 'admin');

        // Fetch users to find employee_john
        try {
            const response = await page.request.get('http://localhost:8060/api/users');
            if (response.ok()) {
                const users = await response.json();
                const empUser = users.find((u: any) => u.username === 'employee_john');

                if (empUser) {
                    // Ensure role is EMPLOYEE (in case it was promoted or dirty)
                    // Using Admin API to update role.
                    // UserList.jsx uses: /admin/users/{id}/role with payload { role: ... }
                    await page.request.put(`http://localhost:8060/api/admin/users/${empUser.id}/role`, {
                        data: { role: 'EMPLOYEE' }
                    });
                    console.log('Sanitized employee_john role to EMPLOYEE');
                } else {
                    console.log('employee_john not found in DB. Test might fail if relying on it.');
                }
            }
        } catch (e) {
            console.error('Failed to sanitize test data:', e);
        }

        await context.close();
    });

    test.skip('Fix 1: File Attachment Toggle Behavior', async ({ page }) => {
        await loginAs(page, 'dummy_employee');
        await page.goto('/app/tickets/new');

        const toggle = page.locator('#attach-toggle');
        const fileInput = page.locator('#file-upload');

        // Initially disabled/hidden logic checks
        if (await toggle.isChecked()) {
            await toggle.uncheck();
        }
        await expect(fileInput).toHaveJSProperty('disabled', true);

        // Check toggle enables input
        await toggle.check();
        await expect(fileInput).toHaveJSProperty('disabled', false);

        // Uncheck disables again
        await toggle.uncheck();
        await expect(fileInput).toHaveJSProperty('disabled', true);

        await logout(page);
    });

    test.skip('Fix 2 & 3: Manager Visibility (Approvals & Self-Requests)', async ({ page }) => {
        // Step 1: Employee creates ticket for Manager
        await loginAs(page, 'dummy_employee');
        await page.goto('/app/tickets/new');

        await page.fill('input[name="title"]', `Emp to Mgr ${ticketTitle}`);
        await page.selectOption('select[name="category"]', 'HARDWARE');
        await page.selectOption('select[name="priority"]', 'MEDIUM');
        await page.fill('textarea[name="description"]', 'Testing Manager Approval Visibility');
        await page.fill('input[name="deviceDetails"]', 'Mouse'); // Hardware requires device

        // Select Manager
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/');
        await logout(page);

        // Step 2: Manager Logs in - Checks Approvals
        await loginAs(page, 'dummy_manager');

        // Should be on Dashboard. Verify "Pending Approvals" tab is active or visible
        await expect(page.getByText('Pending Approvals')).toBeVisible();
        await page.getByText('Pending Approvals').click(); // Ensure clicked

        // Verify ticket is visible
        await expect(page.getByText(`Emp to Mgr ${ticketTitle}`)).toBeVisible();

        // Step 3: Manager Creates Own Ticket (Self-Request)
        await page.goto('/app/tickets/new');
        await page.fill('input[name="title"]', `Mgr Self ${ticketTitle}`);
        await page.selectOption('select[name="category"]', 'SOFTWARE');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.fill('textarea[name="description"]', 'Manager needing software');
        await page.fill('input[name="softwareName"]', 'Visio');
        await page.fill('input[name="softwareVersion"]', '2025');

        // Manager might assign to themselves or Admin.
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/');

        // Step 4: Verify "My Requests"
        await page.getByText('My Requests').click();
        await expect(page.getByText(`Mgr Self ${ticketTitle}`)).toBeVisible();

        // Since they assigned to themselves, it should ALSO be in Pending Approvals
        await page.getByText('Pending Approvals').click();
        await expect(page.getByText(`Mgr Self ${ticketTitle}`)).toBeVisible();

        await logout(page);
    });

    test('Fix 4: Admin-Only Password Login & SSO Rules', async ({ page, request }) => {
        // 1. Verify Admin Password Login Success
        await page.goto('/login');
        await page.fill('input[name="username"]', USERS.admin.username);
        await page.fill('input[name="password"]', USERS.admin.password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/app\/admin/);
        await expect(page.locator('h1')).toContainText(/Admin Dashboard/i);
        await logout(page);

        // 2. Verify Employee Password Login Restricted
        await page.goto('/login');
        await page.fill('input[name="username"]', USERS.employee.username);
        await page.fill('input[name="password"]', USERS.employee.password);
        await page.click('button[type="submit"]');

        // Expert error message
        await expect(page.getByText(/restricted/i)).toBeVisible();
        // Should remain on login page
        await expect(page).toHaveURL(/\/login/);
    });
});
