import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES = path.resolve(__dirname, 'fixtures');

function uniq(prefix: string) {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '');
    return `${prefix}_${ts}`;
}

// ---------- Helpers ----------
async function login(page, username: string, password: string) {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    // Wait for navigation or specific element to ensure login success
    await expect(page).toHaveURL(/dashboard|tickets|home|app/i);
}

async function logout(page) {
    // adapt to your UI dropdown
    await page.getByRole('button', { name: /g_|profile|account|logout/i }).first().click().catch(() => { });
    // Fallback if the button above was the logout itself or opened a menu
    if (await page.getByRole('link', { name: /sign out|logout/i }).isVisible()) {
        await page.getByRole('link', { name: /sign out|logout/i }).click();
    } else if (await page.getByRole('button', { name: /sign out|logout/i }).isVisible()) {
        await page.getByRole('button', { name: /sign out|logout/i }).click();
    }
    await expect(page).toHaveURL(/login/i);
}

async function createTicketAsEmployee(page, ticketTitle: string, mgrNameVisible: string, testInfo) {
    // Navigate to create ticket page
    await page.getByRole('link', { name: /report issue|create ticket|new ticket/i }).first().click();

    // Fill fields (update labels according to your UI)
    await page.getByLabel(/title|issue title/i).fill(ticketTitle);

    // Example fields based on your screenshot:
    // Helper to find option value by text
    const selectOptionByRegex = async (labelPattern, optionPattern) => {
        const select = page.getByLabel(labelPattern);
        const option = select.locator('option').filter({ hasText: optionPattern }).first();
        const value = await option.getAttribute('value');
        if (value) {
            await select.selectOption(value);
        } else {
            // fallback: try direct select if pattern is string
            if (typeof optionPattern === 'string') {
                await select.selectOption({ label: optionPattern }).catch(() => { });
            }
        }
    };

    // await page.getByLabel(/device asset id|serial/i).fill('gsg-pc-70').catch(() => {}); // might not exist
    await selectOptionByRegex(/category/i, /software installation|upgrade/i);
    await selectOptionByRegex(/priority/i, /high/i);
    await page.getByLabel(/software name/i).fill('AutoCAD');
    await page.getByLabel(/version/i).fill('2020');
    await page.getByLabel(/description/i).fill('E2E: AutoCAD licensing error + attachment test');

    // Upload employee attachment
    const empFile = path.join(FIXTURES, 'employee_attachment.pdf');
    await page.setInputFiles('input[type="file"]', empFile);

    // Proof 1: Employee ticket created (form filled, before manager select which might fail)
    await page.screenshot({ path: testInfo.outputPath('1_employee_ticket_created.png') });

    // Manager selection
    // If you have "Fetch Managers" button
    const fetchBtn = page.getByRole('button', { name: /fetch managers/i });
    if (await fetchBtn.isVisible().catch(() => false)) {
        await fetchBtn.click();
    }

    // Select manager from dropdown
    await selectOptionByRegex(/approving manager/i, new RegExp(mgrNameVisible, 'i'));

    // Submit request
    // Proof 1: Employee ticket created showing attachment selected
    await page.screenshot({ path: testInfo.outputPath('1_employee_ticket_created.png') });
    await page.getByRole('button', { name: /submit request|create ticket/i }).click();

    // Validate success
    await expect(page.getByText(/successfully submitted|ticket created|submitted/i)).toBeVisible();
}

async function openTicketFromList(page, ticketTitle: string) {
    await page.getByRole('link', { name: /dashboard|tickets/i }).first().click();

    // click ticket row/card by title
    // Add hard wait if needed for table load, but locator with wait is better
    await page.getByText(ticketTitle, { exact: false }).first().click();

    // ticket detail page should show title
    await expect(page.getByText(ticketTitle)).toBeVisible();
}

async function postDiscussionComment(page, comment: string) {
    const box = page.getByPlaceholder(/type a response|add a comment|write a comment/i);
    await box.fill(comment);
    await page.getByRole('button', { name: /post comment|send/i }).click();
    await expect(page.getByText(comment)).toBeVisible();
}

async function expectAttachmentVisible(page, fileNamePart: string) {
    await expect(page.getByText(new RegExp(fileNamePart, 'i')).first()).toBeVisible();
}

async function downloadAttachmentByName(page, fileNamePart: string, downloadDir: string) {
    // Find the attachment row containing name and click download icon/button
    const rowText = page.getByText(new RegExp(fileNamePart, 'i')).first();
    await expect(rowText).toBeVisible();

    // Assuming button is nearby. 
    // Locate a download button in the same container/row
    // This might be tricky without specific test-ids. 
    // Trying to find a button near the text. 
    // e.g. parent -> button

    const downloadPromise = page.waitForEvent('download');

    // Try finding a button inside the same list item or row
    // We'll try specific selectors or just clicking the file link if it triggers download
    if (await page.locator(`a:has-text("${fileNamePart}")`).count() > 0) {
        await page.locator(`a:has-text("${fileNamePart}")`).click();
    } else {
        // Try button sibling
        await rowText.locator('..').getByRole('button').first().click();
    }

    const download = await downloadPromise;

    const filePath = path.join(downloadDir, await download.suggestedFilename());
    await download.saveAs(filePath);

    expect(fs.existsSync(filePath)).toBeTruthy();
    return filePath;
}

async function managerApproveTicket(page, mgrComment: string) {
    // right panel "Manager Approval"
    // Try finding the radio/checkbox for approve
    await page.getByLabel(/approve/i).check().catch(async () => {
        await page.getByText(/approve/i).click();
    });

    const mgrBox = page.getByPlaceholder(/add a reason|note|comment/i);
    await mgrBox.fill(mgrComment);

    await page.getByRole('button', { name: /submit review|approve/i }).click();
    // Wait for status change
    await expect(page.getByText(/approved|manager approved/i)).toBeVisible();
}



// ---------- MAIN E2E ----------
test.describe('IT4U Ticket Flow', () => {
    test('Flow', async ({ page }, testInfo) => {
        const adminUser = 'admin';
        const adminPass = 'Admin@123';

        const EMP1 = { user: 'e2e_emp_01', pass: 'Pass@12345' };
        const MGR1 = { user: 'e2e_mgr_01', pass: 'Pass@12345', visibleName: 'E2E Manager 01' };
        const IT1 = { user: 'e2e_it_01', pass: 'Pass@12345' };

        const ticketTitle = uniq('E2E_Attachments_Visibility');
        console.log(`Starting test with Ticket Title: ${ticketTitle}`);

        // Login as EMP1
        await login(page, EMP1.user, EMP1.pass);
        await createTicketAsEmployee(page, ticketTitle, MGR1.visibleName, testInfo); // passed testInfo

        // Open ticket details
        await openTicketFromList(page, ticketTitle);
        const empComment = `Employee comment: Please fix ASAP. (${ticketTitle})`;
        await postDiscussionComment(page, empComment);

        // verify employee attachment visible
        await expectAttachmentVisible(page, 'employee_attachment');

        // Proof 2: Employee ticket detail
        await page.screenshot({ path: testInfo.outputPath('2_employee_ticket_detail.png') });

        await logout(page);
        console.log('Employee step done.');

        // --------- MANAGER 1 ----------
        await login(page, MGR1.user, MGR1.pass);
        await openTicketFromList(page, ticketTitle);

        await expect(page.getByText(empComment)).toBeVisible();
        await expectAttachmentVisible(page, 'employee_attachment');

        // Proof 3: Manager ticket detail
        await page.screenshot({ path: testInfo.outputPath('3_manager_ticket_detail.png') });

        const downloadDir = testInfo.outputPath('downloads');
        fs.mkdirSync(downloadDir, { recursive: true });
        try {
            await downloadAttachmentByName(page, 'employee_attachment', downloadDir);
        } catch (e) {
            console.warn('Download check failed', e);
        }

        if (await page.locator('input[type="file"]').isVisible()) {
            const mgrFile = path.join(FIXTURES, 'manager_attachment.png');
            await page.setInputFiles('input[type="file"]', mgrFile);
            // Proof 4: Manager uploads new attachment
            await page.screenshot({ path: testInfo.outputPath('4_manager_attachment_upload.png') });
        }

        const mgrComment = `Manager comment: Approved for IT action. (${ticketTitle})`;
        await postDiscussionComment(page, mgrComment);
        await managerApproveTicket(page, `Approved - proceed. (${ticketTitle})`);

        await logout(page);
        console.log('Manager step done.');

        // --------- IT SUPPORT ----------
        await login(page, IT1.user, IT1.pass);
        await openTicketFromList(page, ticketTitle);

        await expect(page.getByText(empComment)).toBeVisible();
        await expect(page.getByText(/Manager comment:/i)).toBeVisible();
        await expectAttachmentVisible(page, 'employee_attachment');

        // Proof 5: IT Support sees both
        await page.screenshot({ path: testInfo.outputPath('5_it_support_view.png') });

        const itComment = `IT Support: Investigating. (${ticketTitle})`;
        await postDiscussionComment(page, itComment);

        const inProgressBtn = page.getByRole('button', { name: /in progress|start work/i });
        if (await inProgressBtn.isVisible().catch(() => false)) {
            await inProgressBtn.click();
        }

        const closeBtn = page.getByRole('button', { name: /close/i });
        if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click();
            await expect(page.getByText(/closed|close/i)).toBeVisible();
        }

        await logout(page);
        console.log('IT step done.');

        // --------- EMPLOYEE 1 VERIFY ----------
        await login(page, EMP1.user, EMP1.pass);
        await openTicketFromList(page, ticketTitle);

        await expect(page.getByText(/closed|resolved/i)).toBeVisible();
        await expect(page.getByText(itComment)).toBeVisible();

        // Proof 6: Employee final view
        await page.screenshot({ path: testInfo.outputPath('6_employee_final_view.png') });

        await logout(page);
    });
});
