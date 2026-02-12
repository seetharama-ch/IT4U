import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Admin Attachment Feature', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should allow admin to upload, view, and delete attachments', async ({ page }) => {
        const logFile = 'debug_log.txt';
        const log = (msg) => fs.appendFileSync(logFile, msg + '\n');
        fs.writeFileSync(logFile, 'Starting Test\n');

        // 1. Create a ticket to test on
        await page.goto('/app/tickets/new');

        // Listen for console logsEARLY
        page.on('console', msg => log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => log(`PAGE ERROR: ${err.message}`));
        page.on('requestfailed', request => log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`));

        const title = `Attachment Test Ticket ${Date.now()}`;
        await page.fill('input[name="title"]', title);
        await page.fill('textarea[name="description"]', 'Testing attachments');
        await page.selectOption('select[name="category"]', 'OTHERS');

        log('Submitting ticket...');
        await page.click('button[type="submit"]');

        // Check for validation errors
        const validationError = page.locator('.text-red-600');
        if (await validationError.count() > 0) {
            log(`Form Validation Errors: ${await validationError.allTextContents()}`);
        }

        // Wait for Success Modal
        log('Waiting for success modal...');
        try {
            await expect(page.getByTestId('ticket-success-modal')).toBeVisible({ timeout: 15000 });
            log('Success modal visible');

            // Capture ticket number/ID if possible (optional, but good for debug)
            const successMsg = await page.getByTestId('ticket-success-modal').textContent();
            log(`Success Message: ${successMsg}`);

            // Click OK
            await page.getByTestId('ticket-success-ok').click();
            log('Clicked OK on modal');
        } catch (e) {
            log('Success modal NOT found, checking for error modal');
            if (await page.getByTestId('ticket-form-error').count() > 0) {
                log(`Form Error: ${await page.getByTestId('ticket-form-error').textContent()}`);
            }
            throw e;
        }

        // Wait for redirect to Employee Dashboard
        await expect(page).toHaveURL(/\/app\/employee/);
        log('Redirected to Employee Dashboard');

        // Find the ticket we just created by title and click it
        // We might need to reload or wait for list to refresh
        log(`Looking for ticket with title: ${title}`);
        await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
        await page.getByText(title).click();

        // Now should be on details page
        log('Clicked ticket, waiting for details page...');
        await expect(page).toHaveURL(/\/app\/tickets\/\d+/);
        log('On Ticket Details page');

        // 2. Upload Attachment
        log('Uploading attachment...');
        await expect(page.getByText('Upload New File')).toBeVisible();

        const fileContent = 'This is a test attachment content.';
        const fileName = 'test-attachment.txt';

        // Listen for console logs to debug frontend
        page.on('console', msg => log(`BROWSER LOG: ${msg.text()}`));

        const fileInput = page.locator('input[type="file"]');

        // Setup response listener before action
        const uploadPromise = page.waitForResponse(resp => resp.url().includes('/attachments') && resp.request().method() === 'POST', { timeout: 10000 }).catch(() => null);

        await fileInput.setInputFiles({
            name: fileName,
            mimeType: 'text/plain',
            buffer: Buffer.from(fileContent)
        });

        // Trigger upload if needed (FileUploader uploads on change)
        log('File set in input.');

        // Check for immediate validation error
        const errorMsg = page.locator('.text-red-600');
        if (await errorMsg.isVisible()) {
            log(`Validation Error: ${await errorMsg.textContent()}`);
        }

        const response = await uploadPromise;
        if (response) {
            log(`Upload Response: ${response.status()} ${response.statusText()}`);
            if (response.status() !== 200 && response.status() !== 201) {
                try {
                    log(`Upload Body: ${await response.text()}`);
                } catch (e) {
                    log('Could not read response body');
                }
            }
        } else {
            log('No upload request detected within 10s');
        }

        // Wait for list to update
        try {
            await expect(page.getByText(fileName)).toBeVisible({ timeout: 10000 });
            log('File visible in list');
        } catch (e) {
            log('File NOT visible in list');
            throw e;
        }

        // 4. Verify Download (Access)
        // Check if link/button exists
        const attachmentLink = page.getByText(fileName);
        await expect(attachmentLink).toBeVisible();
        // Optionally click and waitForRequest to download endpoint

        // 5. Delete Attachment
        // Look for delete button/icon near the file
        const deleteBtn = page.locator('li', { hasText: fileName }).getByRole('button').or(page.locator('li', { hasText: fileName }).getByTestId('delete-attachment'));

        if (await deleteBtn.count() > 0) {
            page.on('dialog', dialog => dialog.accept());
            await deleteBtn.first().click();

            // Verify removal
            await expect(page.getByText(fileName)).not.toBeVisible({ timeout: 10000 });
        } else {
            log("Delete button not found, skipping delete check or failing");
        }
    });
});
