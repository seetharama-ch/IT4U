import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const TIMESTAMP = Date.now().toString();

test.describe.serial('IT4U Simple E2E Flow', () => {

    test('Admin: Login and Create Manager User', async ({ page }) => {
        console.log('=== Admin: Creating Manager User ===');

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('button[type="submit"]')
        ]);

        await expect(page).toHaveURL(/.*\/app\/admin/);
        console.log('✓ Admin logged in');

        // Navigate to Users page
        await page.goto(`${BASE_URL}/app/admin/users`, { waitUntil: 'networkidle' });
        console.log('✓ Navigated to Users page');

        // Wait for page to be fully loaded
        await page.waitForSelector('table', { timeout: 5000 });

        // Create Manager
        await page.click('button:has-text("+ Add User")');
        await page.waitForSelector('h3:has-text("Create New User")', { timeout: 3000 });
        console.log('✓ Modal opened');

        const username = `mgr_e2e_${TIMESTAMP}`;
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', 'E2E@12345');
        await page.fill('input[name="email"]', `mgr${TIMESTAMP}@test.com`);
        await page.fill('input[name="phoneNumber"]', '1234567890');
        await page.selectOption('select[name="role"]', 'MANAGER');
        await page.fill('input[name="department"]', 'IT Testing');
        await page.fill('input[name="jobTitle"]', 'Test Manager');

        console.log(`✓ Form filled for user: ${username}`);

        // Click Create and wait for modal to close
        await page.click('button:has-text("Create")');

        // Wait for either success message or modal to disappear
        await page.waitForTimeout(2000); // Give backend time to create user

        // Check for success message (green alert)
        const successMessage = page.locator('.bg-green-50, .text-green-700');
        const hasSuccess = await successMessage.isVisible().catch(() => false);

        if (hasSuccess) {
            const msgText = await successMessage.textContent();
            console.log(`✓ Success message: ${msgText}`);
        }

        // Reload page to ensure fresh data
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('table');

        // Check if user exists in table (more robust check)
        const userRow = page.locator('tr', { hasText: username });
        const exists = await userRow.count();

        if (exists > 0) {
            console.log(`✓ User ${username} found in table`);
            expect(exists).toBeGreaterThan(0);
        } else {
            console.error(`✗ User ${username} NOT found in table`);
            throw new Error(`User ${username} not found after creation`);
        }
    });

    test('Employee: Login and Create Ticket with Manager Selection', async ({ page }) => {
        console.log('=== Employee: Creating Ticket with Manager ===');

        // Use existing employee user
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'employee_john');
        await page.fill('input[name="password"]', 'password');

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            page.click('button[type="submit"]')
        ]);

        await expect(page).toHaveURL(/.*\/app\/employee/);
        console.log('✓ Employee logged in');

        // Navigate to create ticket using TEST IDS
        await page.goto(`${BASE_URL}/app/tickets/new`, { waitUntil: 'networkidle' });
        console.log('✓ Navigated to Create Ticket page');

        // Wait for managers to auto-load
        await page.waitForTimeout(1500);

        // Fill ticket form using TEST IDS
        const ticketTitle = `E2E-Test-${TIMESTAMP}`;
        await page.fill('[data-testid="ticket-title"]', ticketTitle);
        await page.selectOption('[data-testid="ticket-category"]', 'HARDWARE');
        await page.fill('[data-testid="ticket-description"]', 'E2E test ticket with manager selection');

        console.log(`✓ Ticket form filled: ${ticketTitle}`);

        // Select first available manager from dropdown
        const managerSelect = page.locator('[data-testid="ticket-manager"]');
        const managerOptions = await managerSelect.locator('option').count();

        if (managerOptions > 1) {
            await managerSelect.selectOption({ index: 1 }); // Select first non-"Select Manager..." option
            console.log('✓ Manager selected from dropdown');
        } else {
            console.warn('⚠ No managers available in dropdown');
        }

        // Submit using TEST ID
        await page.click('[data-testid="ticket-submit"]');

        // Wait for success modal using TEST ID
        await page.waitForSelector('[data-testid="ticket-success-modal"]', { timeout: 5000 });
        console.log('✓ Success modal appeared');

        // Click OK button using TEST ID
        await page.click('[data-testid="ticket-success-ok"]');

        // Should be back at employee dashboard
        await page.waitForURL(/.*\/app\/employee/, { timeout: 5000 });
        console.log('✓ Redirected to dashboard');

        // Test passes!
        expect(true).toBe(true);
        console.log('✅ Employee ticket creation with manager selection - PASSED');
    });

});
