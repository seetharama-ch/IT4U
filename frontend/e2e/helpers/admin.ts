import { expect, Page } from '@playwright/test';

export type NewUser = {
    name: string;
    username: string;
    email: string;
    password: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'IT_SUPPORT' | 'ADMIN';
};

async function goAdminUsers(page: Page) {
    // Go to admin users area directly
    await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
}

export async function createUserUI(page: Page, user: NewUser) {
    await goAdminUsers(page);

    // Check if user already exists
    const existingRow =
        page.getByTestId(`user-row-${user.username}`)
            .or(page.locator('tr').filter({ hasText: user.username }))
            .or(page.locator('div,li').filter({ hasText: user.username }));

    if (await existingRow.first().isVisible().catch(() => false)) {
        console.log(`User ${user.username} already exists. Skipping creation.`);
        return;
    }

    // Click Add/Create user
    const addBtn =
        page.getByTestId('user-add')
            .or(page.getByRole('button', { name: /add user|create user|new user/i }));

    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill form (prefer testids, fallback to names)
    const username = page.getByTestId('user-username').or(page.locator('input[name="username"]'));
    const email = page.getByTestId('user-email').or(page.locator('input[name="email"]'));
    const password = page.getByTestId('user-password').or(page.locator('input[name="password"]'));
    const role = page.getByTestId('user-role').or(page.locator('select[name="role"]'));
    const dept = page.locator('input[name="department"]');
    const job = page.locator('input[name="jobTitle"]');
    const phone = page.locator('input[name="phoneNumber"]');

    await expect(username).toBeVisible();
    await username.fill(user.username);
    await email.fill(user.email);
    await password.fill(user.password);

    // Backend fails on empty strings, so providing defaults
    await dept.fill('General');
    await job.fill('Staff');
    await phone.fill('1234567890');

    // role select can be <select> or custom dropdown
    if (await role.isVisible().catch(() => false)) {
        // try selectOption by value (most reliable for standard selects)
        await role.selectOption({ value: user.role }).catch(async () => {
            // Fallback for custom dropdowns (if any) or label match
            await role.click();
            await page.getByRole('option', { name: new RegExp(user.role, 'i') }).click();
        });
    } else {
        // fallback: click role dropdown by text
        const roleDropdown = page.locator('select').first();
        await roleDropdown.selectOption({ value: user.role });
    }

    const save =
        page.getByTestId('user-save')
            .or(page.getByRole('button', { name: /save|create/i }));

    await save.click();

    // Expect success toast or user row appears
    const toast = page.getByTestId('toast-success').or(page.locator('[role="status"]').filter({ hasText: /success|created/i }));
    await toast.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => { });
    await page.waitForLoadState('networkidle');

    // Verify row exists in list (by username or email)
    const row =
        page.getByTestId(`user-row-${user.username}`)
            .or(page.locator('tr').filter({ hasText: user.username }))
            .first();

    await expect(row).toBeVisible({ timeout: 15_000 });
}

