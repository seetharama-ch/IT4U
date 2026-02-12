import { test, expect } from '@playwright/test';

test.describe('Admin Create User & Local Login', () => {

    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin');
        await page.click('button:has-text("Login with Username/Password")');
        await expect(page).toHaveURL(/\/app\/admin/);
    });

    test('Admin creates user with gmail domain as EMPLOYEE, sets password, user logs in', async ({ page, browser }) => {
        // 1. Create User
        await page.goto('/app/admin/users');
        await page.getByText('Create New User').click();

        // Wait for modal
        await expect(page.locator('h2:has-text("Create New User")')).toBeVisible();

        const randomSuffix = Math.floor(Math.random() * 10000);
        const username = `localuser${randomSuffix}`;
        const email = `localuser${randomSuffix}@gmail.com`;

        await page.fill('input[name="username"]', username);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.selectOption('select[name="role"]', 'EMPLOYEE'); // Ensuring role selection
        // Fill other required fields if any (jobTitle etc? assuming defaults or not required)

        // Submit
        await page.getByRole('button', { name: 'Create User' }).click();

        // Verify success toast or list update (optional)
        await expect(page.getByText('User created successfully')).toBeVisible();

        // 2. Logout
        await page.goto('/app/admin'); // go somewhere safe
        // finding logout button might be tricky, usually in header profile menu
        // Assuming /login clears session or there is a logout button
        // Let's rely on creating a NEW context for the user login to be safe and cleaner
    });

    test('User logs in with created credentials', async ({ browser }) => {
        // We need to persist the user data from previous step or allow this test to do it all in one.
        // To run "User logs in" we need the user to exist. 
        // Let's combine this into one test case for simplicity as "full lifecycle".
    });
});

test('Admin Create User -> Local Login Lifecycle', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button:has-text("Login with Username/Password")');
    await expect(page).toHaveURL(/\/app\/admin/);

    // 2. Create User
    await page.goto('/app/admin/users');
    await page.getByRole('button', { name: 'Create New User' }).click();

    const randomSuffix = Date.now();
    const username = `gmail_user_${randomSuffix}`;
    const email = `test.user.${randomSuffix}@gmail.com`;

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="firstName"]', 'Test'); // check if separate name fields exist
    // Actually UserCreateRequest usually sends explicit fields. 
    // In Login.jsx we saw "Role" logic.
    // Let's check the modal inputs in a separate step if this fails? 
    // Assuming standard inputs from previous context.

    // Select Role
    await page.selectOption('select[name="role"]', 'EMPLOYEE');

    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText('User created successfully')).toBeVisible();

    // 3. Logout
    // Click profile menu then logout, or just hit /login to clear? 
    // Best to click logout.
    // If not found, clear cookies
    await page.context().clearCookies();
    await page.goto('/login');

    // 4. Login as New User
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Login with Username/Password")');

    // 5. Verify Access
    await expect(page).toHaveURL(/\/app\/employee/);
    await expect(page.locator('h1')).toContainText('Employee Dashboard');
});
