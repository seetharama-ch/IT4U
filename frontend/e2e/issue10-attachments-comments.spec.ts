import { test } from '@playwright/test';
import { login, logout } from './_helpers/auth';
import {
    createSoftwareInstallTicketWithAttachment,
    openTicketById,
    assertAttachmentVisible,
    managerApproveWithComment,
    assertCommentVisible
} from './_helpers/ticket';

test('ISSUE-10: Employee attachment must appear in Manager; Manager comment must appear in IT/Admin', async ({ page }) => {
    const empUser = process.env.E2E_EMP_USER!;
    const empPass = process.env.E2E_EMP_PASS!;
    const mgrUser = process.env.E2E_MGR_USER!;
    const mgrPass = process.env.E2E_MGR_PASS!;
    const itUser = process.env.E2E_IT_USER!;
    const itPass = process.env.E2E_IT_PASS!;
    const adminUser = process.env.E2E_ADMIN_USER!;
    const adminPass = process.env.E2E_ADMIN_PASS!;

    const comment = `Manager comment - ${Date.now()}`;
    const filePath = 'e2e/_assets/sample.png';

    console.log("Step 1: Employee creates ticket with attachment");
    await login(page, empUser, empPass);
    const ticketId = await createSoftwareInstallTicketWithAttachment(page, filePath);
    console.log(`Ticket created: ${ticketId}`);
    await logout(page);

    console.log("Step 2: Manager opens ticket and must see attachment");
    await login(page, mgrUser, mgrPass);
    await openTicketById(page, ticketId);
    await assertAttachmentVisible(page); // Manager must see the employee attachment (ISSUE-10 part 1)
    await managerApproveWithComment(page, comment);
    await logout(page);

    console.log("Step 3: IT Support opens ticket and must see manager comment");
    await login(page, itUser, itPass);
    await openTicketById(page, ticketId);
    await assertCommentVisible(page, comment); // ISSUE-10 part 2
    await logout(page);

    console.log("Step 4: Admin opens ticket and must see manager comment AND attachment");
    await login(page, adminUser, adminPass);
    await openTicketById(page, ticketId);
    await assertAttachmentVisible(page);
    await assertCommentVisible(page, comment);
});
