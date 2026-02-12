import { test, expect } from '@playwright/test';

// Mock user data
const MOCK_USER = {
    id: 1,
    username: 'employee_john',
    email: 'employee_john@geosoftglobal.com',
    role: 'EMPLOYEE',
    authenticated: true
};

test('legacy /create and /new-ticket routes redirect to /app/tickets/new', async ({ page }) => {
    // Mock /auth/me to simulate an authenticated user
    await page.route('**/auth/me', async route => {
        await route.fulfill({ json: MOCK_USER });
    });

    // Mock /tickets/my to prevent errors on dashboard load
    await page.route('**/tickets/my*', async route => {
        await route.fulfill({ json: [] });
    });

    // 1. Visit /create directly (simulating a user clicking a bookmark or old link)
    // Since we are "logged in" via mock, PrivateRoute should allow rendering the component, which is a Navigate.
    await page.goto('/create');

    // Should be redirected to /app/tickets/new
    await expect(page).toHaveURL(/\/app\/tickets\/new/);

    // 2. Visit /new-ticket
    await page.goto('/new-ticket');
    await expect(page).toHaveURL(/\/app\/tickets\/new/);
});
