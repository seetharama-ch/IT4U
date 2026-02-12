import { test, expect } from '@playwright/test';
import { createTestTicketAsEmployee, loginAs, logout } from '../utils/utils';
import { getLatestEmail } from '../utils/email-helpers';

test('Full flow: Employee -> Manager -> Admin', async ({ page, request }) => {

    const ticketTitle = 'E2E – Full Flow Ticket';

    // 1. Employee creates ticket
    await createTestTicketAsEmployee(page, {
        employeeUser: 'employee_john',
        employeePass: 'password',
        title: ticketTitle,
        category: 'SOFTWARE',
        softwareName: 'Full App',
        version: '1.0',
        managerLabel: 'manager_mike',
        attachmentPath: 'e2e/fixtures/sample.txt'
    });

    // Assert redirect to ticket details
    await expect(page).toHaveURL(/\/app\/tickets\/\d+/);

    // Assert Success Toast
    await expect(page.getByText('Ticket created successfully')).toBeVisible();

    await logout(page);

    // 2. Manager approves
    await loginAs(page, 'manager_mike', 'password');
    await page.getByText(new RegExp(ticketTitle, 'i')).click();
    await page.getByRole('button', { name: /Approve Request/i }).click();
    await logout(page);

    // 3. Admin sets to In Progress
    await loginAs(page, 'admin', 'password');

    await page.getByRole('button', { name: /Approved\/Other/i }).click();

    // Find the ticket and open/edit it
    await page.getByText(new RegExp(ticketTitle, 'i')).click();

    // Verify existing attachment
    await expect(page.getByText('sample.txt')).toBeVisible();

    // Add new attachment (evidence)
    // "Add File" section check
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/evidence.txt');
    await page.getByRole('button', { name: /Upload File/i }).click();

    // Wait for upload (check if file list updates)
    await expect(page.getByText('evidence.txt')).toBeVisible();

    // Download check for evidence
    const downloadPromise = page.waitForEvent('download');
    // Finds download link for evidence.txt
    await page.locator('li').filter({ hasText: 'evidence.txt' }).getByRole('link', { name: /Download/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('evidence.txt');

    // Status Change
    await page.getByRole('button', { name: /Mark In Progress/i }).click();

    // Verify status update
    await expect(page.getByText(/IN_PROGRESS/i)).toBeVisible();

    // 4. Verify Email Notification (Employee should receive update)
    // Authenticate API as Admin to check emails
    await request.post('/api/auth/login', {
        data: { username: 'admin', password: 'password' }
    });
    const updateEmail = await getLatestEmail(request, 'employee_john@geosoftglobal.com', 'Ticket Status Updated');
    expect(updateEmail).toBeTruthy();
});
