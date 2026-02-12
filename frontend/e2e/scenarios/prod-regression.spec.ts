import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../utils/utils';

// Production Users
const EMPLOYEE = { username: 'ganesh_kalla', password: 'Geosoft@1234' };
const MANAGER = { username: 'duppala_muralidhar', password: 'Geosoft@1234' };
const IT_SUPPORT = { username: 'Admin_Support', password: 'password' };
const ADMIN = { username: 'admin', password: 'password' };

test.describe('Production Regression Cycle', () => {
    let ticketId: string;
    const ticketTitle = `Prod Regression Test ${Date.now()}`;

    test('Full Ticket Lifecycle (Create -> Approve -> Resolve -> Close)', async ({ page }) => {

        await test.step('1. Employee Creates Ticket', async () => {
            console.log('Logging in as Employee...');
            await loginAs(page, EMPLOYEE.username, EMPLOYEE.password);

            await page.goto('/app/tickets/new');
            await page.getByLabel(/^Title$/i).fill(ticketTitle);
            await page.getByLabel(/^Category$/i).selectOption('SOFTWARE');
            await page.getByLabel(/^Software Name$/i).fill('Adobe Acrobat');
            await page.getByLabel(/^Version$/i).fill('Pro 2024');
            await page.getByLabel(/^Description$/i).fill('Regression test for approval flow.');

            // Should auto-select manager if linked, otherwise redundant
            await page.getByRole('button', { name: /Submit Request/i }).click();

            // Verify Ticket Created and get ID (optional, visual check)
            await expect(page.getByText(ticketTitle)).toBeVisible();
            await logout(page);
        });

        await test.step('2. Manager Approves Ticket', async () => {
            console.log('Logging in as Manager...');
            await loginAs(page, MANAGER.username, MANAGER.password);

            await page.getByRole('link', { name: /Approve Tickets/i }).click();
            await expect(page.getByRole('heading', { name: /Team Approvals/i })).toBeVisible();

            // Find ticket by text
            const ticketRow = page.getByRole('row', { name: ticketTitle });
            await expect(ticketRow).toBeVisible();

            // Click Approve (assuming button is in the row or we open details)
            // If details view:
            await ticketRow.getByRole('button', { name: /View/i }).click();
            await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();

            await page.getByRole('button', { name: /Approve/i }).click();
            await expect(page.getByText(/Approved/i)).toBeVisible();

            await logout(page);
        });

        await test.step('3. IT Support Assigns & Resolves', async () => {
            console.log('Logging in as IT Support...');
            await loginAs(page, IT_SUPPORT.username, IT_SUPPORT.password);

            // Go to All Tickets (or queue)
            // Assuming default dashboard has it or "All Tickets" link
            await page.goto('/support-dashboard');
            // Or if different URL, rely on navigation.
            // Let's use direct URL to be safe if menu varies

            // Search for ticket
            // If there's a search bar
            // await page.getByPlaceholder(/Search/i).fill(ticketTitle); 
            // Else find on page (might be paginated, but for now assume top)
            const ticketLink = page.getByText(ticketTitle);
            await ticketLink.click();

            // Assign to self
            await page.getByRole('button', { name: /Assign to Me/i }).click();
            await expect(page.getByText(/Assigned/i)).toBeVisible();

            // Move to Resolved
            await page.getByRole('button', { name: /Resolve/i }).click();
            // Confirm modal if any
            // await page.getByRole('button', { name: /Confirm/i }).click();
            await expect(page.getByText(/RESOLVED/i)).toBeVisible();

            await logout(page);
        });

        await test.step('4. Employee Closes Ticket', async () => {
            console.log('Logging in as Employee to Close...');
            await loginAs(page, EMPLOYEE.username, EMPLOYEE.password);

            await page.getByText(ticketTitle).click(); // Open details
            await page.getByRole('button', { name: /Close Ticket/i }).click();

            await expect(page.getByText(/CLOSED/i)).toBeVisible();
            await logout(page);
        });
    });
});
