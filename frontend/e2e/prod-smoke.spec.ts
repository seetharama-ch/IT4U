
import { test, expect } from '@playwright/test';

test.describe('PROD Smoke Test', () => {
    // Only run this test for the 'prod' project
    // test.skip(({ project }) => project.name !== 'prod', 'Only for PROD smoke tests');

    test('Dashboard loads and no calls to 8080', async ({ page }) => {
        // Intercept all requests to catch any going to port 8080
        const failedRequests: string[] = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes(':8080')) {
                failedRequests.push(url);
            }
        });

        // Navigate to the Dashboard (will likely redirect to login if not auth'd)
        await page.goto('/app/admin');

        // Check if we are redirected to login (expected if fresh session)
        // OR if we are on dashboard (if session persists)
        // Just ensuring page load doesn't crash is a good step.
        await expect(page).toHaveTitle(/IT4U|Login/);

        // Assert NO requests went to 8080
        expect(failedRequests, `Found requests to port 8080: ${failedRequests.join(', ')}`).toHaveLength(0);

        // Verify API calls are going to /api (relative) or valid external
        // We can check a specific call if we log in, but for smoke test
        // simply ensuring no 8080 is the critical part of this task.
    });

    test('Create Ticket Page redirects to Login on 401', async ({ page }) => {
        // Ensure we are logged out or use incognito context
        await page.context().clearCookies();

        await page.goto('/app/tickets/new');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });
});
