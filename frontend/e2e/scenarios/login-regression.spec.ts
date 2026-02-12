import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../utils/utils';

// Using users verified in verify_login_all.ps1 and test-data.ts
const USERS = [
    { username: 'admin', password: 'password', role: 'Admin' },
    { username: 'employee_john', password: 'password', role: 'Employee' },
    { username: 'manager_mike', password: 'password', role: 'Manager' },
    { username: 'it_support_jane', password: 'password', role: 'IT Support' },
];

test.describe('Login Regression', () => {
    test('All roles should login successfully and see correct dashboard', async ({ page }) => {
        for (const user of USERS) {
            console.log(`Logging in as ${user.role} (${user.username})...`);
            await loginAs(page, user.username, user.password);

            // Verified dashboard titles from TicketList.jsx
            if (user.role === 'Admin') {
                await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
            } else if (user.role === 'Manager') {
                await expect(page.getByRole('heading', { name: /Team Approvals/i })).toBeVisible();
            } else if (user.role === 'IT Support') {
                // JSX says 'All Support Tickets'
                await expect(page.getByRole('heading', { name: /All Support Tickets/i })).toBeVisible();
            } else {
                // Employee
                await expect(page.getByRole('heading', { name: /My Tickets/i })).toBeVisible();
            }

            await logout(page);
        }
    });

    test('Incorrect password should show error', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel(/^Username$/i).fill(USERS[1].username); // employee
        await page.getByLabel(/^Password$/i).fill('wrongpassword');
        await page.getByRole('button', { name: /Sign in/i }).click();

        await expect(page.getByText(/Invalid username or password/i)).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });
});
