import { test, expect } from '@playwright/test';
import { loadProdCredentials, waitForStability } from './helpers/testUtils';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';
const TIMESTAMP = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12);

// Dynamic users for testing
const USERS = {
    admin: { ...loadProdCredentials().admin }, // Load existing admin
    support: {
        username: `repro_sup_${TIMESTAMP}`,
        password: 'Password@123',
        fullName: `Repro Support ${TIMESTAMP}`,
        email: `repro_sup_${TIMESTAMP}@test.local`,
        phoneNumber: '+15551239999',
        role: 'IT_SUPPORT',
        department: 'IT'
    }
};

test.describe.serial('Reproduction: Logout & Attachments', () => {

    // Setup: Create an IT Support user using Admin
    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        const adminCreds = USERS.admin;
        const passwordToUse = adminCreds.password === 'Admin@123' ? 'admin123' : adminCreds.password;

        // Login Admin
        await page.goto(`${BASE_URL}/login`);
        await page.getByTestId('login-username').or(page.locator('input[name="username"]')).fill(adminCreds.username);
        await page.getByTestId('login-password').or(page.locator('input[name="password"]')).fill(passwordToUse);
        await page.getByRole('button', { name: /login|submit/i }).click();
        await page.waitForURL(/\/app\/admin/);

        // Create IT Support User
        await page.goto(`${BASE_URL}/app/admin/users`);
        await page.getByRole('button', { name: /\+? ?Add User/i }).click();
        await page.fill('input[name="username"]', USERS.support.username);
        await page.fill('input[name="email"]', USERS.support.email);
        await page.fill('input[name="phoneNumber"]', USERS.support.phoneNumber);
        await page.locator('input[type="password"]').first().fill(USERS.support.password);
        await page.locator('select[name="role"]').or(page.getByLabel(/role/i)).selectOption(USERS.support.role);
        await page.locator('input[name="department"]').fill(USERS.support.department);
        await page.click('button[type="submit"]');

        await expect(page.locator('text=created successfully')).toBeVisible();
        await page.close();
    });

    test('Reproduction 1: Logout Verification (Blank Page Check)', async ({ page }) => {
        // 1. Login as Admin
        const adminCreds = USERS.admin;
        const passwordToUse = adminCreds.password === 'Admin@123' ? 'admin123' : adminCreds.password;

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', adminCreds.username);
        await page.fill('input[name="password"]', passwordToUse);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/app\/admin/);

        // 2. Logout
        console.log('Attempting logout...');
        await page.locator('[data-testid="user-menu"]').click();
        await page.getByTestId('logout-btn').click();

        // 3. Verify Login Page
        // Wait specifically for url to be login, and verify content
        await Promise.all([
            page.waitForURL(/\/login/),
            page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 10000 })
        ]);

        console.log('Logout successful, login page visible.');

        // 4. Double Check by refreshing
        await page.reload();
        await expect(page.locator('input[name="username"]')).toBeVisible();
    });

    test('Reproduction 2: Attachment Upload for IT Support', async ({ page }) => {
        const support = USERS.support;
        const password = support.password;

        // 1. Login as IT Support
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', support.username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/app\/it-support/);

        // 2. Create a Ticket to test upload on
        await page.goto(`${BASE_URL}/app/tickets/new`);
        await page.fill('input[name="title"]', `Attachment Test ${TIMESTAMP}`);
        await page.locator('select[name="category"]').selectOption('HARDWARE');
        await page.fill('textarea[name="description"]', 'Testing attachment upload.');
        await page.click('button[type="submit"]');

        // Handle Success Modal
        await expect(page.getByTestId('ticket-success-modal')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('ticket-success-ok').click();

        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        // Capture ID
        const url = page.url();
        const ticketId = url.split('/').pop();
        console.log(`Created Ticket ${ticketId} for attachment test`);

        // 3. Upload File
        // Create a dummy file
        const successMessage = page.locator('text=Ticket updated successfully').or(page.locator('text=Upload successful')); // Adjust based on actual toast
        // Note: The UI just refreshes the list or shows a success toast? 
        // FileUploader calls onUploadSuccess -> fetchTicket -> Toast? No toast in FileUploader, just onUploadSuccess.
        // But TicketDetails doesn't show toast on refresh.
        // We will verify the file appears in the list.

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-upload.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('This is a test upload content.')
        });

        // Wait for upload progress or file to appear
        // The list is "AttachmentList". We expect "test-upload.txt" to appear.
        await expect(page.locator('text=test-upload.txt')).toBeVisible({ timeout: 15000 });
        console.log('Attachment upload verified for IT Support.');
    });

    test('Reproduction 3: Attachment Upload for Admin', async ({ page }) => {
        const adminCreds = USERS.admin;
        const passwordToUse = adminCreds.password === 'Admin@123' ? 'admin123' : adminCreds.password;

        // 1. Login as Admin
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', adminCreds.username);
        await page.fill('input[name="password"]', passwordToUse);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/app\/admin/);

        // 2. Use existing ticket from previous test or create new
        await page.goto(`${BASE_URL}/app/tickets/new`);
        await page.fill('input[name="title"]', `Admin Attachment Test ${TIMESTAMP}`);
        await page.locator('select[name="category"]').selectOption('SOFTWARE');
        await page.fill('textarea[name="description"]', 'Testing admin upload.');
        await page.click('button[type="submit"]');

        // Handle Success Modal
        await expect(page.getByTestId('ticket-success-modal')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('ticket-success-ok').click();

        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);

        // 3. Upload File
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'admin-upload.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Admin test upload content.')
        });

        await expect(page.locator('text=admin-upload.txt')).toBeVisible({ timeout: 15000 });
        console.log('Attachment upload verified for Admin.');
    });
});
