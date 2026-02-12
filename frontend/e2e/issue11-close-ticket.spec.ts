import { test } from '@playwright/test';
import { login, logout } from './_helpers/auth';
import {
    createSoftwareInstallTicketWithAttachment,
    openTicketById,
    managerApproveWithComment,
    adminAssignToItAndClose
} from './_helpers/ticket';

test('ISSUE-11: IT/Admin must be able to close ticket without Internal Server Error', async ({ page }) => {
    const empUser = process.env.E2E_EMP_USER!;
    const empPass = process.env.E2E_EMP_PASS!;
    const mgrUser = process.env.E2E_MGR_USER!;
    const mgrPass = process.env.E2E_MGR_PASS!;
    const adminUser = process.env.E2E_ADMIN_USER!;
    const adminPass = process.env.E2E_ADMIN_PASS!;

    const filePath = 'e2e/_assets/sample.png';
    const comment = `Approve for closure - ${Date.now()}`;

    console.log("Step 1: Employee creates ticket");
    await login(page, empUser, empPass);
    const ticketId = await createSoftwareInstallTicketWithAttachment(page, filePath);
    console.log(`Ticket created: ${ticketId}`);
    await logout(page);

    console.log("Step 2: Manager approves (so admin can close after assignment)");
    await login(page, mgrUser, mgrPass);
    await openTicketById(page, ticketId);
    await managerApproveWithComment(page, comment);
    await logout(page);

    console.log("Step 3: Admin assigns + closes (this currently fails with 500)");
    await login(page, adminUser, adminPass);
    await openTicketById(page, ticketId);
    await adminAssignToItAndClose(page); // Must not show "Internal Server Error"
});
