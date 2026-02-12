
import { test, expect } from '@playwright/test';
import { loginAs } from './utils/login-helpers';
import * as path from 'path';

test.describe('Attachments Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Ensure we have a ticket or create one
    });

    test('Attachments lifecycle: Upload (Employee) -> View (Manager) -> Delete (Admin)', async ({ page }) => {
        // 1. Employee Uploads
        await loginAs(page, 'employee');
        await page.click('text=New Ticket');
        // Simple ticket
        await page.fill('input[name="title"]', 'Attachment Test Ticket');
        await page.fill('textarea[name="description"]', 'Testing attachments');
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.click('button:has-text("Submit Ticket")');
        await page.waitForTimeout(2000);
        const ticketId = (await page.url()).split('/').pop();

        // Upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-attachment.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('This is a test attachment content.')
        });

        // Wait for upload? FileUploader usually auto-uploads on select or drop?
        // Checking FileUploader.jsx: onChange calls handleFileSelect -> handleUpload.
        // So yes, immediate upload.
        await expect(page.locator('text=Uploading...')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=test-attachment.txt')).toBeVisible({ timeout: 10000 });

        // 2. Manager Views
        await loginAs(page, 'manager');
        await page.goto(`/app/tickets/${ticketId}`);
        await expect(page.locator('text=test-attachment.txt')).toBeVisible();

        // Try to download (optional, hard to test in headless)

        // 3. Admin Deletes
        await loginAs(page, 'admin');
        await page.goto(`/app/tickets/${ticketId}`);
        await expect(page.locator('text=test-attachment.txt')).toBeVisible();

        // Click delete button near attachment
        // Assuming AttachmentList has delete button.
        // confirm dialog
        page.on('dialog', dialog => dialog.accept());
        await page.click('button[title="Delete Attachment"]'); // Adjust selector as needed

        // Verify gone
        await expect(page.locator('text=test-attachment.txt')).not.toBeVisible();
    });
});
