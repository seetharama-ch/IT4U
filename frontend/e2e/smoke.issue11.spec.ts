import { test, expect } from '@playwright/test';
import { loginAsEmployee, loginAsAdmin } from './_helpers/auth';
import { createSoftwareInstallTicketWithAttachment, openTicketById, adminAssignToItAndClose } from './_helpers/ticket';
import * as path from 'path';

const ATTACHMENT_PATH = path.resolve('data/sample-attachment.txt');

test.describe('Issue 11 Smoke Suite: Robust Notification Handling', () => {

    let ticketId: string;

    test('1. Create Ticket for Closure Test', async ({ page }) => {
        await loginAsEmployee(page);
        ticketId = await createSoftwareInstallTicketWithAttachment(page, ATTACHMENT_PATH);
        console.log(`[Smoke-Issue11] Created Ticket #${ticketId} for Closure Test`);
    });

    test('2. Admin: Close Ticket (Should NOT crash with 500)', async ({ page }) => {
        expect(ticketId).toBeDefined();

        await loginAsAdmin(page);
        await openTicketById(page, ticketId);

        // Perform Close Action
        // This action triggers the "Status Changed" email notification
        // If SMTP is flaky or blocked, the backend `try/catch` or `notifications.enabled=false` 
        // should prevent the 500 Error.
        await adminAssignToItAndClose(page);

        // Final verification: Reload and check status is indeed closed
        await page.reload();
        await expect(page.getByText(/closed/i).first()).toBeVisible();
    });
});
