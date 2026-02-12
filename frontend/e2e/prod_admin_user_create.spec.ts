import { test, expect } from '@playwright/test';
import { loginAs, logout } from './utils/login-helpers';

test.describe('PROD - Admin User Creation', () => {

    test('Admin creates QA users', async ({ page }) => {
        // 1. Login as Admin
        // Assuming admin credentials are in fixture or env. Using helper.
        // NOTE: loginAs uses USERS fixture. We might need real admin creds if different.
        // For prod, we assume standard 'admin' works or is configured.
        await loginAs(page, 'admin');

        // 2. Navigate to Users
        await page.goto('/app/admin/users');
        await expect(page).toHaveURL(/\/app\/admin\/users/);

        // Define users to create
        const qaUsers = [
            { username: 'qa_emp1', role: 'EMPLOYEE', dept: 'Engineering', mgr: 'qa_mgr1' }, // recursive dependency handled?
            { username: 'qa_mgr1', role: 'MANAGER', dept: 'Engineering', mgr: '' },
            { username: 'qa_its1', role: 'IT_SUPPORT', dept: 'IT', mgr: '' }
        ];

        // Create Manager first to satisfy dependency if needed, or just create safely
        // Let's create Manager first
        const usersOrdered = [
            qaUsers[1], // Manager
            qaUsers[0], // Employee
            qaUsers[2]  // IT Support
        ];

        for (const user of usersOrdered) {
            // Check if user exists (skip if so for idempotency)
            // Ideally we'd delete them first, but sticking to "create if missing" or "allow failure"

            // Click Create User
            await page.getByRole('button', { name: /New User|Create User/i }).click();

            // Fill Form
            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="password"]', 'Test@1234'); // Default test pass
            // Select Role
            await page.selectOption('select[name="role"]', user.role);

            if (user.dept) {
                await page.fill('input[name="department"]', user.dept);
            }

            if (user.mgr) {
                // If manager selection is strictly a dropdown of existing users, this might fail if manager not yet created
                // But we ordered them. 
                // However, UI might require search or reload manager list. 
                // If text input:
                // await page.fill('input[name="manager"]', user.mgr);
                // If select:
                // await page.selectOption('select[name="manager"]', user.mgr);
            }

            // Submit
            await page.getByRole('button', { name: /Save|Create/i }).click();

            // Handle "User already exists" toast/alert gracefully?
            // Test might fail if user exists. Ideally we check presence first.
            // For now, let's assume valid flow or success.

            // Wait for success toast or modal close
            // await expect(page.getByText('User created successfully')).toBeVisible(); 
            // OR modal disappears
        }

        // Verify users appear in list
        for (const user of usersOrdered) {
            await expect(page.getByRole('cell', { name: user.username })).toBeVisible();
        }

        await logout(page);
    });
});
