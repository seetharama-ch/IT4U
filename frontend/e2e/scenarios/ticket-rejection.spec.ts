import { test, expect } from '@playwright/test';
import { USERS } from '../fixtures/test-data';
import { loginAs } from '../utils/login-helpers';

test.describe('Ticket Rejection Workflow', () => {
    test.setTimeout(120000);

    // 1. Seed All Test Users
    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000);
        const page = await browser.newPage();
        await loginAs(page, 'admin');
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');

        const ensureUser = async (roleKey, roleType, dept = 'General') => {
            const user = USERS[roleKey];
            if (!user) return;

            const content = await page.content();
            if (!content.includes(user.username)) {
                await page.click('button:has-text("Add New User")');
                await page.fill('input[name="username"]', user.username);
                await page.fill('input[name="password"]', user.password);
                await page.fill('input[name="fullName"]', user.name);
                await page.fill('input[name="email"]', user.email);
                await page.selectOption('select[name="role"]', roleType);
                if (roleType !== 'ADMIN') {
                    await page.fill('input[name="department"]', dept);
                }
                await page.click('button:has-text("Register")');
                await page.waitForTimeout(1000);
            }
        };

        await ensureUser('dummy_manager', 'MANAGER', 'Engineering');
        await ensureUser('dummy_employee', 'EMPLOYEE', 'Engineering');

        await page.close();
    });

    test('Manager Reject Flow: Employee Create -> Manager Reject -> Verify Status', async ({ page }) => {

        // 1. Employee Creates Ticket
        await loginAs(page, 'dummy_employee');
        await page.click('text=New Ticket');

        const ticketTitle = `Rejection Test ${Date.now()}`;
        await page.fill('input[name="title"]', ticketTitle);
        await page.selectOption('select[name="category"]', 'SOFTWARE');
        await page.selectOption('select[name="priority"]', 'MEDIUM');
        await page.fill('textarea[name="description"]', 'Ticket destined for rejection.');

        // Select Manager
        await page.selectOption('select[name="managerSelect"]', USERS.dummy_manager.username);

        await page.click('button[type="submit"]');
        await page.click('button:has-text("Go to My Tickets")');

        await expect(page.getByText(ticketTitle)).toBeVisible();
        await expect(page.getByText('PENDING')).toBeVisible();

        await page.click('button:has-text("Logout")');

        // 2. Manager Rejects Ticket
        await loginAs(page, 'dummy_manager');
        await page.click('text=Pending Approvals');

        const ticketRow = page.locator('tr').filter({ hasText: ticketTitle });
        await expect(ticketRow).toBeVisible();
        await ticketRow.getByText('View').click();

        // Reject
        await page.click('button:has-text("Reject Response")'); // Trigger modal
        await page.fill('textarea[name="comment"]', 'Rejection reason: Not approved.');
        await page.click('button:has-text("Reject Ticket")'); // Confirm reject in modal

        // Verify Status in Manager View (should probably disappear or show rejected)
        // If "Pending Approvals" shows only pending, it should be gone.
        // Let's check "My Approvals" history if it exists, or just logout.

        await page.click('button:has-text("Logout")');

        // 3. Employee Verifies Rejection
        await loginAs(page, 'dummy_employee');
        await page.click('text=My Tickets');

        const rejectedTicketRow = page.locator('tr').filter({ hasText: ticketTitle });
        await expect(rejectedTicketRow).toBeVisible();
        await expect(rejectedTicketRow).toContainText('REJECTED');

        // Optional: Open View to see comment
        await rejectedTicketRow.getByText('View').click();
        await expect(page.getByText('Rejection reason: Not approved.')).toBeVisible();
    });
});
