import { test, expect } from '@playwright/test';
import { createTestTicketAsEmployee, loginAs, logout } from '../utils/utils';
import { getLatestEmail } from '../utils/email-helpers';
import { USERS } from '../fixtures/test-data';

// Happy Path: Employee creates ticket -> Manager receives email -> Manager Approves -> IT Support Notified
test.describe('Ticket Lifecycle & Notifications', () => {

    test('Happy Path: Create Ticket -> Manager Approve -> Email Checks', async ({ page, request }) => {

        // 0. Setup: Authenticate API Request as Admin (to check email audit log)
        const authResponse = await request.post('/api/auth/login', {
            data: {
                username: 'admin',
                password: 'password'
            }
        });
        expect(authResponse.ok(), 'Admin API login failed').toBeTruthy();

        // 1. Create Ticket
        await createTestTicketAsEmployee(page, {
            employeeUser: 'employee_john',
            employeePass: 'password',
            title: 'Happy Path Ticket',
            category: 'SOFTWARE',
            softwareName: 'Test Soft',
            version: '2.0',
            managerLabel: 'manager_mike', // Value in dropdown is manager_mike based on subagent scan
            priority: 'HIGH',
            attachmentPath: 'e2e/fixtures/sample.txt'
        });

        // Verify we are back on dashboard and ticket is visible
        await expect(page.getByRole('heading', { name: /My Tickets/i })).toBeVisible();
        await expect(page.getByText('Happy Path Ticket')).toBeVisible();

        // 2. Check Emails (Manager should get one)
        // Manager username: manager_mike, email: manager_mike@geosoftglobal.com (from test-data.ts)
        const managerEmail = await getLatestEmail(request, 'manager_mike@geosoftglobal.com', 'Approval Required');
        expect(managerEmail).toBeTruthy();

        // 3. Manager Approves
        await logout(page);
        await loginAs(page, 'manager_mike', 'password');

        // Go to Pending Approvals (Default view for Manager verified: "Team Approvals")
        await expect(page.getByRole('heading', { name: /Team Approvals/i })).toBeVisible();

        // Find ticket and approve
        await page.getByText('Happy Path Ticket').click();

        // Verify Attachment matches
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('link', { name: /Download/i }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('sample.txt');

        await page.getByRole('button', { name: /Approve Request/i }).click(); // Verified: "Approve Request"

        // Check "My Requests" tab or ensure it's gone from Pending.
        await expect(page.getByText('Happy Path Ticket')).toBeHidden(); // It should disappear from Pending

        // 4. Check IT Support Email
        const approvalEmail = await getLatestEmail(request, 'it_support_jane@geosoftglobal.com', 'Ticket Approved');
        expect(approvalEmail).toBeTruthy();
    });
});
