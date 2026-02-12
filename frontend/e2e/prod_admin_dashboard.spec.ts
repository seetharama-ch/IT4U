/**
 * Production Admin Dashboard Tests
 * Comprehensive tests for Admin role dashboard and functionalities
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, generateTestId, expectNoFailToLoad, waitForStability } from './helpers/testUtils';

test.describe('Production Admin Dashboard', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('Admin dashboard loads without errors', async ({ page }) => {
        await login(page, creds.admin);

        // Should redirect to admin dashboard
        await expect(page).toHaveURL(/\/app\/admin/);

        // Dashboard should be visible
        await expect(page.locator('header')).toBeVisible();
        await waitForStability(page);

        // No "Failed to load" messages
        await expectNoFailToLoad(page);
    });

    test('All admin tabs are accessible', async ({ page }) => {
        await login(page, creds.admin);
        await waitForStability(page);

        // Navigate to Users tab
        const usersLink = page.getByRole('link', { name: /users|user management/i }).first();
        if (await usersLink.isVisible()) {
            await usersLink.click();
            await waitForStability(page);
            await expectNoFailToLoad(page);
            expect(page.url()).toContain('/admin');
        }

        // Navigate to Tickets (global view)
        const ticketsLink = page.getByRole('link', { name: /tickets|all tickets/i }).first();
        if (await ticketsLink.isVisible()) {
            await ticketsLink.click();
            await waitForStability(page);
            await expectNoFailToLoad(page);
        }

        // Navigate to Settings/Categories if present
        const settingsLink = page.getByRole('link', { name: /settings|categories/i }).first();
        if (await settingsLink.isVisible()) {
            await settingsLink.click();
            await waitForStability(page);
            await expectNoFailToLoad(page);
        }

        // Navigate to Reports if present
        const reportsLink = page.getByRole('link', { name: /reports/i }).first();
        if (await reportsLink.isVisible()) {
            await reportsLink.click();
            await waitForStability(page);
            await expectNoFailToLoad(page);
        }
    });

    test('User list loads and search works', async ({ page }) => {
        await login(page, creds.admin);

        // Navigate to users
        await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        // User table should be visible
        await expect(page.locator('table').or(page.getByTestId('users-table'))).toBeVisible();

        // Search functionality (if present)
        const searchInput = page.locator('input[placeholder*="search" i]').or(page.getByTestId('user-search')).first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('admin');
            await page.waitForTimeout(1000); // Allow search to execute

            // Should show admin user
            await expect(page.locator('text=/admin/i')).toBeVisible();
        }
    });

    test('Create test employee user', async ({ page }) => {
        await login(page, creds.admin);
        await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        const username = generateTestId('EMP');
        const createBtn = page.getByRole('button', { name: /create user|add user|new user/i }).first();

        if (await createBtn.isVisible()) {
            await createBtn.click();
            await page.waitForTimeout(500);

            // Fill user form
            const usernameField = page.locator('input[name="username"]').or(page.getByLabel(/username/i)).first();
            const passwordField = page.locator('input[name="password"]').or(page.getByLabel(/password/i)).first();
            const nameField = page.locator('input[name="name"]').or(page.getByLabel(/name|display/i)).first();

            await usernameField.fill(username);
            await passwordField.fill('Password@123');
            if (await nameField.isVisible()) {
                await nameField.fill(`Test Employee ${username}`);
            }

            // Select EMPLOYEE role
            const roleSelect = page.getByLabel(/role/i).first();
            if (await roleSelect.isVisible()) {
                try {
                    await roleSelect.selectOption({ label: /employee/i });
                } catch {
                    await roleSelect.click();
                    await page.getByRole('option', { name: /employee/i }).click();
                }
            }

            // Submit
            const submitBtn = page.getByRole('button', { name: /save|create|submit/i }).first();
            await submitBtn.click();
            await waitForStability(page);

            // Verify user appears in list
            await expect(page.locator(`text=${username}`)).toBeVisible({ timeout: 10000 });
        }
    });

    test('No 405 errors on admin operations', async ({ page }) => {
        const networkFailures: any[] = [];

        page.on('response', (response) => {
            const status = response.status();
            const url = response.url();

            // Track 405 specifically (POST hitting static fallback)
            if (status === 405) {
                networkFailures.push({ url, status, statusText: response.statusText() });
            }
        });

        await login(page, creds.admin);
        await page.goto('/app/admin/users', { waitUntil: 'networkidle' });
        await waitForStability(page);

        expect(networkFailures).toEqual([]);
    });

    test('No console errors on admin dashboard', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (!text.includes('401') && !text.includes('Unauthorized')) {
                    consoleErrors.push(text);
                }
            }
        });

        await login(page, creds.admin);
        await waitForStability(page);
        await page.waitForTimeout(2000);

        expect(consoleErrors).toEqual([]);
    });

    test.afterEach(async ({ page }) => {
        await logout(page).catch(() => { });
    });
});
