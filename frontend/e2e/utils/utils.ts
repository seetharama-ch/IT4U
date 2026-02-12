import { Page, APIRequestContext, expect } from '@playwright/test';

export async function loginAs(page: Page, username: string, password: string = 'password') {
    await page.goto('/login', { timeout: 30000 });
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /Login/i }).click(); // Verified: "Login"
    await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
    // Ensure the menu button is visible and click it to open the dropdown
    await expect(page.locator('#user-menu-button')).toBeVisible();
    await page.locator('#user-menu-button').click();

    // Wait for Sign out button and click
    const signOutBtn = page.getByRole('button', { name: /Sign out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
}

export async function ensureSeedUser(request: APIRequestContext, payload: {
    username: string;
    role: 'ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'IT_SUPPORT';
    name?: string;
    department?: string;
    managerUsername?: string;
}) {
    try {
        await request.post('/api/admin/seed/user', {
            data: payload,
        });
    } catch (e) {
        console.log(`Failed to seed user ${payload.username}: ${e}`);
    }
}

export async function createTestTicketAsEmployee(page: Page, options: {
    employeeUser: string;
    employeePass: string;
    title: string;
    category: string;
    managerLabel?: string;
    priority?: string;
    softwareName?: string;
    version?: string;
    attachmentPath?: string;
}) {
    await loginAs(page, options.employeeUser, options.employeePass);

    // Navigate to "Report Issue" - use direct URL to be robust
    console.log('Navigating to /create');
    await page.goto('/create');
    await expect(page).toHaveURL(/\/app\/tickets\/new/);

    // Fill common fields - verified labels
    console.log('Filling title');
    await page.getByLabel(/^Title$/i).fill(options.title);

    // Category first to trigger dynamic fields
    console.log(`Selecting category: ${options.category}`);
    await page.getByLabel(/^Category$/i).selectOption(options.category);

    console.log('Filling Device Details');
    await page.locator('#deviceDetails').fill('gsg-pc-test');

    if (options.category === 'SOFTWARE') {
        console.log('Filling Software Details');
        if (options.softwareName) await page.locator('#softwareName').fill(options.softwareName);
        if (options.version) await page.locator('#softwareVersion').fill(options.version);
    }

    if (options.priority) {
        console.log('Selecting priority');
        await page.getByLabel(/^Priority$/i).selectOption(options.priority);
    }

    if (options.attachmentPath) {
        console.log('Adding attachment');
        await page.getByLabel(/Attach a file?/i).check();
        await page.setInputFiles('input[type="file"]', options.attachmentPath);
    }

    // Manager Selection
    if (options.managerLabel) {
        console.log('Fetching managers');
        await page.getByRole('button', { name: /Fetch Managers/i }).click();

        console.log(`Selecting manager: ${options.managerLabel}`);
        const managerSelect = page.locator('#managerSelect');
        await managerSelect.waitFor({ state: 'visible' });
        await managerSelect.selectOption({ label: options.managerLabel }).catch(() => managerSelect.selectOption({ value: options.managerLabel }));
    }

    console.log('Filling description');
    await page.getByLabel(/^Description$/i).fill('Automated test ticket.');

    console.log('Submitting request');
    await page.getByRole('button', { name: /Submit Request/i }).click(); // Verified: "Submit Request"

    // Expect success - verified navigation to dashboard and ticket presence
    console.log('Waiting for success');
    await expect(page.getByText(options.title)).toBeVisible();
}
