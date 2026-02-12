import { test, expect } from '@playwright/test';
import { USERS } from '../fixtures/test-data';
import { loginAs } from '../utils/login-helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8060';


test.describe('Missing Email User Workflow', () => {
    test.setTimeout(120000);

    const NO_EMAIL_USER = {
        username: 'no_email_user',
        password: 'password',
        name: 'No Email User',
        email: ''
    };

    test.beforeAll(async ({ browser }) => {
        // Ensure user exists without email
        const page = await browser.newPage();
        await loginAs(page, 'admin');
        await page.goto('/admin/users');

        // Check if exists
        const content = await page.content();
        if (!content.includes(NO_EMAIL_USER.username)) {
            await page.click('button:has-text("Add New User")');
            await page.fill('input[name="username"]', NO_EMAIL_USER.username);
            await page.fill('input[name="password"]', NO_EMAIL_USER.password);
            await page.fill('input[name="fullName"]', NO_EMAIL_USER.name);
            // Leave Email Empty
            await page.selectOption('select[name="role"]', 'EMPLOYEE');
            await page.fill('input[name="department"]', 'Test');
            await page.click('button:has-text("Register")');
        }
        await page.close();
    });

    test('User with no email can create ticket without error', async ({ page }) => {
        // Manual login for custom user
        await page.goto('/login');
        await page.fill('#username', NO_EMAIL_USER.username);
        await page.fill('#password', NO_EMAIL_USER.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/`);

        await page.click('text=New Ticket');

        const ticketTitle = `No Email Test ${Date.now()}`;
        await page.fill('input[name="title"]', ticketTitle);
        await page.selectOption('select[name="category"]', 'ACCESS');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.fill('textarea[name="description"]', 'User has no email, should not crash.');

        // Manager (can use dummy)
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        await page.click('button[type="submit"]');

        // Should see success modal
        await expect(page.locator('#modal-title')).toHaveText('Ticket Created Successfully');

        await page.click('button:has-text("Go to My Tickets")');
        await expect(page.getByText(ticketTitle)).toBeVisible();
    });
});
