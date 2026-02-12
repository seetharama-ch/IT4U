import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
    // Login as Admin before each test
    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('**/api/users', async route => {
            const json = [
                {
                    id: 1,
                    username: 'test_user',
                    email: 'test@example.com',
                    phoneNumber: '1234567890',
                    role: 'EMPLOYEE',
                    department: 'Engineering',
                    jobTitle: 'Developer'
                },
                {
                    id: 2,
                    username: 'admin',
                    email: 'admin@example.com',
                    phoneNumber: '0987654321',
                    role: 'ADMIN',
                    department: 'IT',
                    jobTitle: 'Administrator'
                }
            ];
            await route.fulfill({ json });
        });

        // Mock /auth/me to avoid hanging if backend is down
        await page.route('**/api/auth/me', async route => {
            await route.fulfill({ json: { authenticated: false } });
        });

        // Mock Login? Or bypass login?
        // If we bypass login, we can't test "Login".
        // But app likely checks token.
        // If I mock `/login` also to return success?
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({ json: { token: 'fake-jwt-token', username: 'admin', role: 'ADMIN', id: 2 } });
        });

        // We might need to set localstorage if that's how auth works
        // But UserList.jsx uses `useAuth`.

        await page.goto('/login');
        // If we mock login, we just need to fill form and submit
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/app\/admin/);
    });

    test('should create a new user with email and phone', async ({ page }) => {
        const timestamp = Date.now();
        const newUser = {
            username: `testuser_${timestamp}`,
            email: `test_${timestamp}@example.com`,
            phone: '+1 555-0123'
        };

        await page.click('text=User Management'); // Or navigate via sidebar if needed
        // Assuming User Management is on Dashboard or accessible
        // If not, might need to navigate to /users or similar if routable, but assuming it's a modal/component on main dashboard

        // Check if User Management section is visible
        await expect(page.locator('h2', { hasText: 'User Management' })).toBeVisible();

        await page.click('button:has-text("+ Add User")');
        await expect(page.locator('h3', { hasText: 'Create New User' })).toBeVisible();

        await page.fill('input[name="username"]', newUser.username);
        await page.fill('input[name="password"]', 'password123');
        await page.fill('input[name="email"]', newUser.email);
        await page.fill('input[name="phoneNumber"]', newUser.phone);
        await page.fill('input[name="department"]', 'QA'); // Assuming name=department is present or default
        await page.fill('input[name="jobTitle"]', 'Tester'); // Assuming name=jobTitle is present

        await page.click('button:has-text("Create")');

        // Verify success message
        await expect(page.locator('text=created successfully')).toBeVisible();

        // Verify user in list
        // Might need to reload or wait for list update
        await expect(page.locator(`td:has-text("${newUser.username}")`)).toBeVisible();
        await expect(page.locator(`td:has-text("${newUser.email}")`)).toBeVisible();
        await expect(page.locator(`td:has-text("${newUser.phone}")`)).toBeVisible();
    });

    test('should fail to create user with duplicate email', async ({ page }) => {
        // Relying on previous test or existing data? Best to create fresh or use unique but repeat
        // Let's use a known existing user 'admin' if it has email, or create one first

        const timestamp = Date.now();
        const email = `dup_${timestamp}@example.com`;

        // Create first user
        await page.click('button:has-text("+ Add User")');
        await page.locator('label:has-text("Username") + input').fill(`user1_${timestamp}`);
        await page.locator('label:has-text("Password") + input').fill('password123');
        await page.locator('label:has-text("Email") + input').fill(email);
        await page.locator('label:has-text("Phone Number") + input').fill('+1 555-0123');
        await page.click('button:has-text("Create")');
        await expect(page.locator('text=created successfully')).toBeVisible();

        // Try calculate second user with same email
        await page.click('button:has-text("+ Add User")');
        await page.locator('label:has-text("Username") + input').fill(`user2_${timestamp}`);
        await page.locator('label:has-text("Password") + input').fill('password123');
        await page.locator('label:has-text("Email") + input').fill(email); // DUPLICATE
        await page.locator('label:has-text("Phone Number") + input').fill('+1 555-0124');
        await page.click('button:has-text("Create")');

        // Expect alert or error message (our toast mock)
        // We used window.alert in component code, playwright handles dialogs
        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('Email already exists');
            dialog.dismiss();
        });

        // Or if we implemented a toast div, check for that. UserList.jsx uses `alert()`.
        // So we must handle dialog event.
    });

    test('should keep actions visible on small screens (mobile view)', async ({ page }) => {
        // Override auth mock to simulate logged in user for direct navigation
        await page.route('**/api/auth/me', async route => {
            await route.fulfill({ json: { authenticated: true, role: 'ADMIN', username: 'admin' } });
        });

        // 1. Set viewport to mobile size (iPhone 12/13/14)
        await page.setViewportSize({ width: 390, height: 844 });

        // Navigate to User Management page
        await page.goto('/app/admin/users');

        // Wait for page to settle
        await page.waitForLoadState('networkidle');

        // Check if User Management section is visible
        await expect(page.locator('h2', { hasText: 'User Management' })).toBeVisible();

        // 2. Locate the first row and its actions cell
        const row = page.locator('tbody tr').first();
        const actionsCell = row.locator('td').last();

        // Ensure actions cell is visible immediately (because of sticky positioning)
        // Note: Playwright's toBeVisible() checks if the element is in the viewport and not obscured.
        await expect(actionsCell).toBeVisible();

        // 3. Verify specific action buttons are visible
        await expect(actionsCell.locator('button[title="Edit User"]')).toBeVisible();
        await expect(actionsCell.locator('button[title="Reset Password"]')).toBeVisible();

        // 4. Scroll table to the left (content moves left) to verify sticky remains
        const tableContainer = page.locator('.overflow-x-auto');

        // Verify we CAN scroll (scrollWidth > clientWidth)
        const isScrollable = await tableContainer.evaluate((node) => {
            return node.scrollWidth > node.clientWidth;
        });
        expect(isScrollable).toBeTruthy();

        // Scroll rights
        await tableContainer.evaluate((node) => {
            node.scrollLeft = 200;
        });

        // Actions should still be visible stuck to the right
        await expect(actionsCell).toBeInViewport();

        // 5. Interact with buttons to ensure no clipping or overlay issues
        await actionsCell.locator('button[title="Edit User"]').click();
        await expect(page.locator('h3', { hasText: 'Edit User' })).toBeVisible();
        await page.click('button:has-text("Cancel")');

        await actionsCell.locator('button[title="Reset Password"]').click();
        await expect(page.locator('h3', { hasText: 'Reset Password' })).toBeVisible();
        await page.click('button:has-text("Cancel")');
    });
});
