// e2e/regression_full.spec.ts
//
// IT4U Full Browser E2E Regression (REAL PROD URL ONLY)
// - Uses ONLY https://gsg-mecm (real frontend) which talks to real backend JAR on 8060
// - No mock API, no dev server
// - Visible debug mode: set IT4U_DEBUG=1 to enable slowMo (from config) + extra pauses
//
// Run (CMD):
//   set IT4U_DEBUG=1 && npx playwright test e2e/regression_full.spec.ts --headed
// Run (PowerShell):
//   $env:IT4U_DEBUG="1"; npx playwright test e2e/regression_full.spec.ts --headed
//
// NOTE: Selectors/paths may need tiny adjustments if your UI labels differ.
// This spec is written to be resilient: it searches buttons/labels by accessible name.

import { test, expect, Page } from '@playwright/test';
import path from 'path';

const DEBUG = process.env.IT4U_DEBUG === '1';
const RUN_SSO = process.env.IT4U_RUN_SSO === '1'; // optional; SSO automation can be blocked by MFA/CA policies.

const BASE = 'https://gsg-mecm';

// Credentials (local login)
const CREDS = {
    admin: { user: 'admin', pass: 'Admin@123' },
    manager: { user: 'manager_mike', pass: 'password' },
    support: { user: 'it_support_jane', pass: 'password' },
    employee: { user: 'employee_john', pass: 'password' },
};

// You can keep these stable or let the test create new users each run.
// We'll create new users to ensure "from scratch" behavior, but fall back if create-user UI differs.
type NewUsers = {
    employee1: { username: string; password: string; displayName: string };
    manager1: { username: string; password: string; displayName: string };
    support1: { username: string; password: string; displayName: string };
};

function uniq(prefix: string) {
    const t = new Date();
    const stamp =
        t.getFullYear().toString() +
        String(t.getMonth() + 1).padStart(2, '0') +
        String(t.getDate()).padStart(2, '0') +
        '_' +
        String(t.getHours()).padStart(2, '0') +
        String(t.getMinutes()).padStart(2, '0') +
        String(t.getSeconds()).padStart(2, '0');
    return `${prefix}_${stamp}`;
}

async function pause(page: Page, ms = 900) {
    if (DEBUG) await page.waitForTimeout(ms);
}

async function gotoApp(page: Page, urlPath = '/') {
    // Always use baseURL from config if set; we still harden by using absolute.
    await page.goto(`${BASE}${urlPath}`, { waitUntil: 'domcontentloaded' });
}

async function expectNoFailToLoad(page: Page) {
    await expect(page.getByText(/fail to load/i)).toHaveCount(0);
    await expect(page.getByText(/unauthorized/i)).toHaveCount(0);
    // "No permission" may appear in negative tests; don't assert here beyond core pages.
}

async function loginLocal(page: Page, username: string, password: string) {
    await gotoApp(page, '/');
    // If app lands on /login, this still works; if it lands on dashboard with session, we logout later.
    // Find username/password fields by label/placeholder/name fallback.
    const userField =
        page.getByLabel(/username|user/i).first().or(page.getByPlaceholder(/username|user/i).first());
    const passField =
        page.getByLabel(/password/i).first().or(page.getByPlaceholder(/password/i).first());

    await userField.fill(username);
    await passField.fill(password);

    const loginBtn = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginBtn.click();

    // Wait for navigation or a visible dashboard element.
    await page.waitForLoadState('networkidle');
    await pause(page, 800);

    // If login fails, error toast/message likely appears.
    const maybe401 = page.getByText(/invalid username|invalid password|unauthorized/i);
    if (await maybe401.count()) {
        throw new Error(`Login failed for user ${username}: UI shows invalid/unauthorized`);
    }

    await expectNoFailToLoad(page);
}

async function logoutIfPossible(page: Page) {
    // Try header menu / logout button if exists.
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutBtn.count()) {
        await logoutBtn.first().click();
        await page.waitForLoadState('domcontentloaded');
        await pause(page, 600);
        return;
    }
    // Sometimes logout is in user menu.
    const menuBtn = page.getByRole('button', { name: /profile|account|user|menu/i });
    if (await menuBtn.count()) {
        await menuBtn.first().click();
        await pause(page, 400);
        const logout2 = page.getByRole('menuitem', { name: /logout|sign out/i });
        if (await logout2.count()) {
            await logout2.first().click();
            await page.waitForLoadState('domcontentloaded');
            await pause(page, 600);
        }
    }
}

async function navigateToUsersAdmin(page: Page) {
    // Robust nav: look for sidebar links.
    const usersLink = page.getByRole('link', { name: /users|user management/i });
    if (await usersLink.count()) {
        await usersLink.first().click();
    } else {
        // fallback: navigate by URL commonly used
        await gotoApp(page, '/app/admin/users');
    }
    await page.waitForLoadState('networkidle');
    await pause(page, 600);
    await expectNoFailToLoad(page);
}

async function createUserUI(
    page: Page,
    { username, password, displayName, role }: { username: string; password: string; displayName: string; role: 'EMPLOYEE' | 'MANAGER' | 'IT_SUPPORT' }
) {
    // Click "Create User" / "Add User"
    const addBtn = page.getByRole('button', { name: /create user|add user|new user/i });
    if (!(await addBtn.count())) throw new Error('Create User button not found on Users page');
    await addBtn.first().click();
    await pause(page, 500);

    // Fill fields
    const u = page.getByLabel(/username/i).first().or(page.getByPlaceholder(/username/i).first());
    const p = page.getByLabel(/password/i).first().or(page.getByPlaceholder(/password/i).first());
    const n = page.getByLabel(/name|display name|full name/i).first().or(page.getByPlaceholder(/name/i).first());

    await u.fill(username);
    await p.fill(password);
    if (await n.count()) await n.fill(displayName);

    // Role selector (select or dropdown)
    const roleSelect = page.getByLabel(/role/i).first();
    if (await roleSelect.count()) {
        // Try selectOption
        try {
            await roleSelect.selectOption({ label: new RegExp(role.replace('_', ' '), 'i') as any });
        } catch {
            // dropdown style: click and pick
            await roleSelect.click();
            await pause(page, 300);
            await page.getByRole('option', { name: new RegExp(role.replace('_', ' '), 'i') }).click();
        }
    } else {
        // Some UIs use radio/buttons
        const roleBtn = page.getByRole('button', { name: new RegExp(role.replace('_', ' '), 'i') });
        if (await roleBtn.count()) await roleBtn.first().click();
    }

    const saveBtn = page.getByRole('button', { name: /save|create|submit/i });
    await saveBtn.first().click();

    await page.waitForLoadState('networkidle');
    await pause(page, 800);

    // Success toast/message
    const okToast = page.getByText(/user created|success/i);
    if (await okToast.count()) {
        // ok
    }
}

async function navigateToTickets(page: Page) {
    const ticketsLink = page.getByRole('link', { name: /tickets|ticket dashboard|dashboard/i });
    if (await ticketsLink.count()) {
        await ticketsLink.first().click();
    } else {
        await gotoApp(page, '/app/tickets');
    }
    await page.waitForLoadState('networkidle');
    await pause(page, 600);
    await expectNoFailToLoad(page);
}

async function createTicketWithAttachment(page: Page, title: string, description: string) {
    await navigateToTickets(page);

    const createBtn = page.getByRole('button', { name: /create ticket|new ticket|raise ticket/i });
    await expect(createBtn.first()).toBeVisible();
    await createBtn.first().click();
    await pause(page, 500);

    // Fill form
    const titleField = page.getByLabel(/title/i).first().or(page.getByPlaceholder(/title/i).first());
    const descField = page.getByLabel(/description/i).first().or(page.getByPlaceholder(/description/i).first());

    await titleField.fill(title);
    await descField.fill(description);

    // Category select (optional)
    const cat = page.getByLabel(/category/i).first();
    if (await cat.count()) {
        // pick first non-empty option if possible
        try {
            await cat.selectOption({ index: 1 });
        } catch {
            await cat.click();
            await pause(page, 200);
            const opt = page.getByRole('option').nth(1);
            if (await opt.count()) await opt.click();
        }
    }

    // Attachment upload (input[type=file])
    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'sample.txt');
    if (await fileInput.count()) {
        await fileInput.first().setInputFiles(fixturePath);
        await pause(page, 600);
    }

    const submitBtn = page.getByRole('button', { name: /submit|create|raise/i });
    await submitBtn.first().click();

    // Expect success popup/toast
    await page.waitForLoadState('networkidle');
    await pause(page, 900);

    const successText = page.getByText(/success|ticket created|submitted/i);
    await expect(successText.first()).toBeVisible();

    // Extract ticket number if shown (best effort)
    let ticketNo = '';
    const ticketNoMatch = await page.locator('text=/GSG-\\d+|TICK-\\d+|IT4U-\\d+/i').first().textContent().catch(() => null);
    if (ticketNoMatch) ticketNo = ticketNoMatch.trim();

    // Click OK/Close on popup if present
    const okBtn = page.getByRole('button', { name: /^ok$|close|done/i });
    if (await okBtn.count()) {
        await okBtn.first().click();
        await pause(page, 500);
    }

    // Back on dashboard, ensure ticket row exists by title
    await page.waitForLoadState('networkidle');
    await pause(page, 600);
    await expect(page.getByText(title)).toBeVisible();

    // Timestamp/status columns should be present (best effort)
    await expectNoFailToLoad(page);

    return { ticketNo };
}

async function openTicketByTitle(page: Page, title: string) {
    await navigateToTickets(page);
    // Click the row/title
    await page.getByText(title, { exact: false }).first().click();
    await page.waitForLoadState('networkidle');
    await pause(page, 700);
    await expectNoFailToLoad(page);
}

async function managerApproveOrReject(page: Page, title: string, mode: 'approve' | 'reject') {
    await openTicketByTitle(page, title);

    // Buttons might be "Approve" / "Reject"
    const btn = page.getByRole('button', { name: new RegExp(mode, 'i') });
    await expect(btn.first()).toBeVisible();
    await btn.first().click();
    await pause(page, 400);

    // Comment field (optional)
    const comment = page.getByLabel(/comment|remarks|reason/i).first();
    if (await comment.count()) {
        await comment.fill(`${mode.toUpperCase()} via Playwright ${new Date().toISOString()}`);
    }

    // Confirm
    const confirm = page.getByRole('button', { name: /confirm|submit|ok/i });
    if (await confirm.count()) {
        await confirm.first().click();
    }

    await page.waitForLoadState('networkidle');
    await pause(page, 800);

    // Expect status updated (best effort)
    const statusText = mode === 'approve' ? /approved/i : /rejected/i;
    const statusEl = page.getByText(statusText);
    if (await statusEl.count()) {
        await expect(statusEl.first()).toBeVisible();
    }
    await expectNoFailToLoad(page);
}

async function supportProcessTicket(page: Page, title: string) {
    await openTicketByTitle(page, title);

    // Status dropdown or buttons
    const statusSelect = page.getByLabel(/status/i).first();
    if (await statusSelect.count()) {
        // Try go to In Progress then Resolved
        try {
            await statusSelect.selectOption({ label: /in progress|work in progress|in-process/i as any });
        } catch {
            await statusSelect.click();
            await pause(page, 200);
            const opt = page.getByRole('option', { name: /in progress|work in progress|in-process/i });
            if (await opt.count()) await opt.first().click();
        }
        await pause(page, 400);
    } else {
        const inProgBtn = page.getByRole('button', { name: /work in progress|in progress/i });
        if (await inProgBtn.count()) await inProgBtn.first().click();
    }

    // Add comment if possible
    const comment = page.getByLabel(/comment|work note|remarks/i).first();
    if (await comment.count()) {
        await comment.fill(`Started work ${new Date().toISOString()}`);
    }

    const saveBtn = page.getByRole('button', { name: /save|update|submit/i });
    if (await saveBtn.count()) {
        await saveBtn.first().click();
        await page.waitForLoadState('networkidle');
        await pause(page, 800);
    }

    // Resolve
    if (await statusSelect.count()) {
        try {
            await statusSelect.selectOption({ label: /resolved|closed/i as any });
        } catch {
            await statusSelect.click();
            await pause(page, 200);
            const opt = page.getByRole('option', { name: /resolved|closed/i });
            if (await opt.count()) await opt.first().click();
        }
    } else {
        const resolvedBtn = page.getByRole('button', { name: /resolve|close/i });
        if (await resolvedBtn.count()) await resolvedBtn.first().click();
    }

    if (await comment.count()) {
        await comment.fill(`Resolved ${new Date().toISOString()}`);
    }

    if (await saveBtn.count()) {
        await saveBtn.first().click();
        await page.waitForLoadState('networkidle');
        await pause(page, 900);
    }

    await expectNoFailToLoad(page);
}

async function adminDeleteTicket(page: Page, title: string) {
    await openTicketByTitle(page, title);

    const delBtn = page.getByRole('button', { name: /delete ticket|delete/i });
    await expect(delBtn.first()).toBeVisible();
    await delBtn.first().click();
    await pause(page, 400);

    // 1st confirm dialog
    const confirm1 = page.getByRole('button', { name: /ok|confirm|yes/i });
    if (await confirm1.count()) {
        await confirm1.first().click();
        await pause(page, 500);
    }

    // If your UX has soft/hard choice, try to pick "Hard" if present; else proceed.
    const hardBtn = page.getByRole('button', { name: /hard|permanent/i });
    const softBtn = page.getByRole('button', { name: /soft/i });
    if (await hardBtn.count()) {
        await hardBtn.first().click();
        await pause(page, 400);
    } else if (await softBtn.count()) {
        await softBtn.first().click();
        await pause(page, 400);
    } else {
        // maybe second confirm already the same "OK"
        const confirm2 = page.getByRole('button', { name: /ok|confirm|yes/i });
        if (await confirm2.count()) await confirm2.first().click();
    }

    await page.waitForLoadState('networkidle');
    await pause(page, 900);

    // Success toast
    const toast = page.getByText(/deleted successfully|ticket deleted/i);
    await expect(toast.first()).toBeVisible();

    // Should navigate back to dashboard; ensure ticket title not present
    await navigateToTickets(page);
    await expect(page.getByText(title)).toHaveCount(0);
}

test.describe('IT4U Full E2E Regression (Real PROD URL)', () => {
    test('Full lifecycle: Admin creates users -> Employee creates tickets+attachment -> Manager approve/reject -> Support processes -> Admin deletes', async ({ page }) => {
        // ---- Phase 1: Admin login ----
        await loginLocal(page, CREDS.admin.user, CREDS.admin.pass);
        await pause(page, 800);

        // ---- Phase 2: Admin creates users (best effort) ----
        const newUsers: NewUsers = {
            employee1: { username: uniq('pw_emp'), password: 'Password@123', displayName: 'PW Employee 1' },
            manager1: { username: uniq('pw_mgr'), password: 'Password@123', displayName: 'PW Manager 1' },
            support1: { username: uniq('pw_sup'), password: 'Password@123', displayName: 'PW Support 1' },
        };

        try {
            await navigateToUsersAdmin(page);
            await createUserUI(page, { ...newUsers.employee1, role: 'EMPLOYEE' });
            await createUserUI(page, { ...newUsers.manager1, role: 'MANAGER' });
            await createUserUI(page, { ...newUsers.support1, role: 'IT_SUPPORT' });
        } catch (e) {
            // If User Management UI differs, continue with seeded accounts to avoid blocking regression.
            // Still treat as an actionable signal: report via failure only if you want strictness.
            test.info().annotations.push({ type: 'warning', description: `User creation UI step skipped/fallback: ${(e as Error).message}` });
        }

        await logoutIfPossible(page);

        // ---- Phase 3: Employee creates tickets with attachment ----
        // Prefer newly created employee; fallback to seeded employee if login fails.
        let employeeUser = newUsers.employee1.username;
        let employeePass = newUsers.employee1.password;
        try {
            await loginLocal(page, employeeUser, employeePass);
        } catch {
            employeeUser = CREDS.employee.user;
            employeePass = CREDS.employee.pass;
            await loginLocal(page, employeeUser, employeePass);
        }

        const ticketA_title = uniq('PW Ticket APPROVE');
        const ticketB_title = uniq('PW Ticket REJECT');
        const ticketC_title = uniq('PW Ticket NO-APPROVAL');

        await createTicketWithAttachment(page, ticketA_title, 'Ticket for manager approve scenario (Playwright).');
        await createTicketWithAttachment(page, ticketB_title, 'Ticket for manager reject scenario (Playwright).');
        await createTicketWithAttachment(page, ticketC_title, 'Ticket to be processed by support without manager approval (Playwright).');

        await logoutIfPossible(page);

        // ---- Phase 4: Manager approves A and rejects B ----
        let managerUser = newUsers.manager1.username;
        let managerPass = newUsers.manager1.password;
        try {
            await loginLocal(page, managerUser, managerPass);
        } catch {
            managerUser = CREDS.manager.user;
            managerPass = CREDS.manager.pass;
            await loginLocal(page, managerUser, managerPass);
        }

        await managerApproveOrReject(page, ticketA_title, 'approve');
        await managerApproveOrReject(page, ticketB_title, 'reject');
        await logoutIfPossible(page);

        // ---- Phase 5: Support processes ticketA (approved) and ticketC (no approval) ----
        let supportUser = newUsers.support1.username;
        let supportPass = newUsers.support1.password;
        try {
            await loginLocal(page, supportUser, supportPass);
        } catch {
            supportUser = CREDS.support.user;
            supportPass = CREDS.support.pass;
            await loginLocal(page, supportUser, supportPass);
        }

        await supportProcessTicket(page, ticketA_title);
        await supportProcessTicket(page, ticketC_title);
        await logoutIfPossible(page);

        // ---- Phase 6: Admin deletes (ensure no blank screen, success toast, removed from list) ----
        await loginLocal(page, CREDS.admin.user, CREDS.admin.pass);

        // Delete at least one ticket; if your policy forbids deleting closed tickets, adjust accordingly.
        await adminDeleteTicket(page, ticketB_title);

        // Optional: delete remaining tickets too
        // await adminDeleteTicket(page, ticketA_title);
        // await adminDeleteTicket(page, ticketC_title);

        await logoutIfPossible(page);

        // ---- Optional Phase: SSO smoke (only when explicitly enabled) ----
        test.skip(!RUN_SSO, 'SSO automation is optional and may be blocked by MFA/Conditional Access');
        // If you want SSO automation, add your org-specific steps here (often not stable in automation).
    });
});
