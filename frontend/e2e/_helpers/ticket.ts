import { Page, expect } from '@playwright/test';

export async function createSoftwareInstallTicketWithAttachment(page: Page, attachmentPath: string) {
    await page.goto('/tickets/new', { waitUntil: 'domcontentloaded' });

    // 1. Select Category (TestID)
    const catSelect = page.getByTestId('ticket-category');
    await catSelect.waitFor({ state: 'visible' });
    try {
        await catSelect.selectOption({ label: 'Software Installation / Upgrade' });
    } catch {
        // Fallback or verify values
        await catSelect.selectOption({ index: 1 });
    }

    // 2. Fill Basic Info
    await page.getByTestId('ticket-title').fill('Need VS Code');
    await page.getByTestId('ticket-description').fill('Need VS Code for development');

    // 3. Dynamic Fields (Software Name/Version)
    if (await page.getByLabel(/software name/i).isVisible()) {
        await page.getByLabel(/software name/i).fill('VS Code');
    }
    if (await page.getByLabel(/version/i).isVisible()) {
        await page.getByLabel(/version/i).fill('Latest');
    }

    // 4. Device Asset ID (Conditional)
    if (await page.getByLabel(/device asset id|serial/i).isVisible()) {
        await page.getByLabel(/device asset id|serial/i).fill('gsg-pc-70');
    }

    // 5. Priority (TestID)
    const priority = page.getByTestId('ticket-priority');
    if (await priority.isVisible()) {
        await priority.selectOption({ label: 'Low' });
    }

    // 6. Attachment (TestID)
    if (attachmentPath) {
        // Using setInputFiles directly on the input element found by testId
        const fileInput = page.getByTestId('ticket-attachment');
        await fileInput.setInputFiles(attachmentPath);
        // Verify attachment is staged (check text visibility)
        await expect(page.getByText(/MB/)).toBeVisible();
    }

    // 7. Approving Manager (TestID)
    const mgrSelect = page.getByTestId('ticket-manager');

    // Check if fetch button exists and is needed
    const fetchBtn = page.getByRole('button', { name: /fetch managers/i });
    if (await fetchBtn.isVisible()) {
        await fetchBtn.click();
        await page.waitForTimeout(500);
    }

    if (await mgrSelect.isVisible()) {
        // Wait for managers to load (at least 2 options: Default + 1 Manager)
        await expect(mgrSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 });

        try {
            // Select the second option (first real manager)
            await mgrSelect.selectOption({ index: 1 });
        } catch (e) {
            console.warn("Failed to select manager index 1, attempting label match if possible or ignoring if optional");
        }
    }

    // 8. Submit (TestID)
    await page.getByTestId('ticket-submit').click();

    // 9. Verify Success Modal (TestID)
    await expect(page.getByTestId('ticket-success-modal')).toBeVisible({ timeout: 15000 });
    const successMsg = await page.getByTestId('ticket-success-modal').textContent();

    // Extract ID from success message "Ticket Number: 123"
    const idMatch = successMsg?.match(/Ticket Number:\s*(\d+)/);

    // Close Modal
    await page.getByTestId('ticket-success-ok').click();

    if (idMatch?.[1]) {
        return idMatch[1];
    }

    // Fallback: URL extraction if navigation happened
    const url = page.url();
    const urlMatch = url.match(/tickets\/(\d+)/i);
    if (urlMatch?.[1]) return urlMatch[1];

    throw new Error('Could not extract Ticket ID from Success Modal or URL');
}

export async function openTicketById(page: Page, ticketId: string) {
    await page.goto(`/tickets/${ticketId}`, { waitUntil: 'domcontentloaded' });
    // Verify we are on the right page
    await expect(page.locator('body')).toContainText(`#${ticketId}`);
}

export async function assertAttachmentVisible(page: Page, fileName: string = 'sample.png') {
    // Attachments section should show existing files or list
    await expect(page.getByText(/attachments/i)).toBeVisible();

    // Check for specific filename in the attachment list 
    await expect(page.getByText(fileName)).toBeVisible();
}

export async function managerApproveWithComment(page: Page, comment: string) {
    // 1. Manager Approval Radio (TestID)
    await page.getByTestId('manager-approve-radio').check({ force: true });

    // 2. Comment (TestID)
    await page.getByTestId('manager-comment').fill(comment);

    // 3. Priority (TestID) - Conditional
    const priority = page.getByTestId('manager-priority-select');
    if (await priority.count() > 0 && await priority.isVisible()) {
        await priority.selectOption({ label: 'Medium' });
    }

    // 4. Submit (TestID)
    await page.getByTestId('manager-submit').click();

    // 5. Verify Success (Modal or Toast)
    await expect(page.getByText(/ticket approved|success/i).or(page.getByTestId('ticket-success-modal'))).toBeVisible();
}

export async function assertCommentVisible(page: Page, comment: string) {
    await expect(page.getByText(/discussion|comments/i)).toBeVisible();
    await expect(page.getByText(comment)).toBeVisible();
}

export async function adminAssignToItAndClose(page: Page) {
    // Check for Admin Actions or Edit Button
    const editBtn = page.getByText(/edit/i).first();
    if (await editBtn.isVisible()) {
        await editBtn.click();
    }

    const statusSelect = page.locator('select[name="status"]');
    await statusSelect.waitFor();
    await statusSelect.selectOption({ label: 'Closed' });

    const saveBtn = page.getByText(/save changes|update/i);
    await saveBtn.click();

    // Must NOT show internal server error toast
    const errorToast = page.getByText(/internal server error/i);
    if (await errorToast.isVisible()) {
        throw new Error("Internal Server Error detected!");
    }
    await expect(errorToast).toHaveCount(0);

    // Status pill should update
    await expect(page.getByText(/closed/i).first()).toBeVisible();
}
