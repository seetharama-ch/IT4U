import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * PROD-ONLY Attachment Flow Test
 * Tests Employee upload → Manager view/download flow on https://gsg-mecm
 */

const PROD_URL = 'https://gsg-mecm';

// Enforce PROD-only execution
test.use({ baseURL: PROD_URL });

test.describe('PROD: Attachments Flow (Employee + Manager)', () => {
    let ticketId: string;
    let ticketNumber: string;
    const testFileName = 'test-attachment.txt';
    const testFileContent = 'This is a test attachment for PROD validation.';

    test.beforeAll(() => {
        if (!process.env.BASE_URL?.includes('gsg-mecm') && process.env.BASE_URL) {
            throw new Error('❌ This test MUST run against PROD (https://gsg-mecm) only!');
        }
        console.log('✅ Running against PROD:', PROD_URL);
    });

    test('Employee uploads attachment → Manager views and downloads it', async ({ page }) => {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('PHASE 1: EMPLOYEE CREATES TICKET AND UPLOADS ATTACHMENT');
        console.log('═══════════════════════════════════════════════════════════');

        // ============================================================
        // Step 1: Login as Employee
        // ============================================================
        console.log('\n[1/8] Logging in as Employee...');
        await page.goto(`${PROD_URL}/login`);
        await page.waitForLoadState('networkidle');

        // Wait for Azure SSO redirect or local login
        const currentUrl = page.url();
        if (currentUrl.includes('microsoft') || currentUrl.includes('login.microsoftonline')) {
            console.log('   → Azure SSO detected, manual login required');
            console.log('   → Waiting for user to complete SSO...');
            await page.waitForURL(/\/app/, { timeout: 120000 });
        } else {
            console.log('   → Local auth form detected');
            // For local testing - adapt based on your test users
            // await page.fill('input[name="username"]', 'employee_test');
            // await page.fill('input[name="password"]', 'password');
            // await page.click('button[type="submit"]');
            await page.waitForURL(/\/app/, { timeout: 30000 });
        }

        console.log('   ✓ Employee logged in');

        // ============================================================
        // Step 2: Create Ticket
        // ============================================================
        console.log('\n[2/8] Creating new ticket...');
        await page.click('text=New Ticket');
        await page.waitForSelector('input[name="title"]', { timeout: 10000 });

        const ticketTitle = `Attachment Test ${Date.now()}`;
        await page.fill('input[name="title"]', ticketTitle);
        await page.fill('textarea[name="description"]', 'Testing attachment upload and download flow in PROD');
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.selectOption('select[name="priority"]', 'MEDIUM');

        // Select a manager (if dropdown exists)
        const managerSelect = page.locator('select[name="manager"]');
        if (await managerSelect.count() > 0) {
            const options = await managerSelect.locator('option').all();
            if (options.length > 1) {
                await managerSelect.selectOption({ index: 1 }); // Select first non-empty option
                console.log('   → Manager assigned');
            }
        }

        await page.click('button:has-text("Submit")');
        await page.waitForTimeout(2000);

        // Extract ticket ID from URL
        const urlAfterCreate = page.url();
        ticketId = urlAfterCreate.split('/').pop() || '';
        console.log(`   ✓ Ticket created: ID=${ticketId}`);

        // Get ticket number from page
        const ticketNumberElement = page.locator('text=/IT4U-\\d+/');
        if (await ticketNumberElement.count() > 0) {
            ticketNumber = await ticketNumberElement.textContent() || '';
            console.log(`   ✓ Ticket number: ${ticketNumber}`);
        }

        // ============================================================
        // Step 3: Upload Attachment
        // ============================================================
        console.log('\n[3/8] Uploading attachment...');

        // Create temporary test file
        const tempDir = path.join(process.cwd(), 'e2e', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, testFileName);
        fs.writeFileSync(tempFilePath, testFileContent);

        // Wait for file input to be available
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached({ timeout: 5000 });

        // Set up network monitoring for upload
        const uploadPromise = page.waitForResponse(
            resp => resp.url().includes('/attachments') && resp.request().method() === 'POST',
            { timeout: 15000 }
        );

        // Upload file
        await fileInput.setInputFiles(tempFilePath);

        // Wait for upload response
        const uploadResponse = await uploadPromise;
        const uploadStatus = uploadResponse.status();
        console.log(`   → Upload response: ${uploadStatus}`);

        if (uploadStatus === 200 || uploadStatus === 201) {
            console.log('   ✓ Upload successful');
            const uploadData = await uploadResponse.json();
            console.log(`   → Attachment ID: ${uploadData.id}`);
            console.log(`   → File name: ${uploadData.originalFileName}`);
            console.log(`   → Size: ${uploadData.sizeBytes} bytes`);
        } else {
            const errorBody = await uploadResponse.text();
            console.error(`   ✗ Upload failed: ${uploadStatus}`);
            console.error(`   → Response: ${errorBody}`);
            throw new Error(`Upload failed with status ${uploadStatus}`);
        }

        // Verify attachment appears in UI
        await expect(page.locator(`text=${testFileName}`)).toBeVisible({ timeout: 10000 });
        console.log(`   ✓ Attachment visible in UI: ${testFileName}`);

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        // Take screenshot
        await page.screenshot({ path: path.join(tempDir, 'employee-uploaded-attachment.png'), fullPage: true });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('PHASE 2: MANAGER VIEWS AND DOWNLOADS ATTACHMENT');
        console.log('═══════════════════════════════════════════════════════════');

        // ============================================================
        // Step 4: Login as Manager
        // ============================================================
        console.log('\n[4/8] Logging in as Manager...');

        // Logout current user
        const userMenu = page.locator('button:has-text("Settings"), button[aria-label*="user"], button[aria-label*="menu"]').first();
        if (await userMenu.count() > 0) {
            await userMenu.click();
            await page.click('text=Logout, text=Sign Out');
        } else {
            await page.goto(`${PROD_URL}/logout`);
        }

        await page.waitForTimeout(2000);

        // Login as manager
        await page.goto(`${PROD_URL}/login`);
        const managerLoginUrl = page.url();
        if (managerLoginUrl.includes('microsoft') || managerLoginUrl.includes('login.microsoftonline')) {
            console.log('   → Azure SSO detected for Manager');
            console.log('   → Waiting for manager to complete SSO...');
            await page.waitForURL(/\/app/, { timeout: 120000 });
        } else {
            // For local testing
            await page.waitForURL(/\/app/, { timeout: 30000 });
        }

        console.log('   ✓ Manager logged in');

        // ============================================================
        // Step 5: Navigate to Ticket
        // ============================================================
        console.log('\n[5/8] Navigating to ticket...');
        await page.goto(`${PROD_URL}/app/tickets/${ticketId}`);
        await page.waitForLoadState('networkidle');

        // Verify ticket loads
        await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
        console.log('   ✓ Ticket loaded');

        // ============================================================
        // Step 6: Verify Attachment Visible
        // ============================================================
        console.log('\n[6/8] Verifying attachment visible to Manager...');
        const attachmentElement = page.locator(`text=${testFileName}`);
        await expect(attachmentElement).toBeVisible({ timeout: 5000 });
        console.log(`   ✓ Attachment visible: ${testFileName}`);

        await page.screenshot({ path: path.join(tempDir, 'manager-views-attachment.png'), fullPage: true });

        // ============================================================
        // Step 7: Download Attachment
        // ============================================================
        console.log('\n[7/8] Downloading attachment...');

        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
        const downloadButton = page.locator('button:has-text("Download")').first();

        await downloadButton.click();
        const download = await downloadPromise;

        console.log(`   → Download started: ${download.suggestedFilename()}`);
        expect(download.suggestedFilename()).toBe(testFileName);

        // Save and verify downloaded file
        const downloadPath = path.join(tempDir, `downloaded-${testFileName}`);
        await download.saveAs(downloadPath);
        console.log(`   ✓ File downloaded: ${downloadPath}`);

        // Verify file content
        const downloadedContent = fs.readFileSync(downloadPath, 'utf-8');
        expect(downloadedContent).toBe(testFileContent);
        console.log('   ✓ File content verified');

        // Clean up downloaded file
        fs.unlinkSync(downloadPath);

        // ============================================================
        // Step 8: Final Verification
        // ============================================================
        console.log('\n[8/8] Final verification...');
        console.log('   ✓ Employee can upload attachments');
        console.log('   ✓ Manager can view attachments on assigned tickets');
        console.log('   ✓ Manager can download attachments');
        console.log('   ✓ File content integrity maintained');

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ ATTACHMENT FLOW TEST PASSED');
        console.log('═══════════════════════════════════════════════════════════\n');
    });

    test('File size validation: Upload too large file (> 2MB)', async ({ page }) => {
        console.log('\n[VALIDATION TEST] File size limit...');

        // Login as employee and create/open ticket
        await page.goto(`${PROD_URL}/login`);
        await page.waitForURL(/\/app/, { timeout: 120000 });

        // Navigate to any ticket or create one
        await page.click('text=New Ticket');
        await page.fill('input[name="title"]', 'Size Test Ticket');
        await page.fill('textarea[name="description"]', 'Testing file size validation');
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.click('button:has-text("Submit")');
        await page.waitForTimeout(2000);

        // Create a file > 2MB
        const tempDir = path.join(process.cwd(), 'e2e', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const largeFilePath = path.join(tempDir, 'large-file.txt');
        const largeContent = 'A'.repeat(3 * 1024 * 1024); // 3MB
        fs.writeFileSync(largeFilePath, largeContent);

        // Try to upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(largeFilePath);

        // Should see error message
        const errorMessage = page.locator('text=/File too large|Max 2MB|2 MB/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
        console.log('   ✓ File size validation working (shows error for >2MB)');

        // Clean up
        fs.unlinkSync(largeFilePath);
    });

    test('File type validation: Upload unsupported file type', async ({ page }) => {
        console.log('\n[VALIDATION TEST] File type restriction...');

        await page.goto(`${PROD_URL}/login`);
        await page.waitForURL(/\/app/, { timeout: 120000 });

        // Navigate to any ticket
        await page.click('text=New Ticket');
        await page.fill('input[name="title"]', 'Type Test Ticket');
        await page.fill('textarea[name="description"]', 'Testing file type validation');
        await page.selectOption('select[name="category"]', 'OTHERS');
        await page.selectOption('select[name="priority"]', 'LOW');
        await page.click('button:has-text("Submit")');
        await page.waitForTimeout(2000);

        // Create unsupported file type (.exe)
        const tempDir = path.join(process.cwd(), 'e2e', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const unsupportedFilePath = path.join(tempDir, 'test.exe');
        fs.writeFileSync(unsupportedFilePath, 'fake executable content');

        // Try to upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(unsupportedFilePath);

        // Should see error message
        const errorMessage = page.locator('text=/Unsupported file type|PDF, PNG, JPG, TXT only/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
        console.log('   ✓ File type validation working (rejects .exe files)');

        // Clean up
        fs.unlinkSync(unsupportedFilePath);
    });
});
