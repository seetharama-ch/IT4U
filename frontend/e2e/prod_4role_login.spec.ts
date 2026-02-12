/**
 * Production 4-Role Login Test with Setup
 * 1. Creates test users if missing (via Admin)
 * 2. Verifies login for all 4 roles
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, waitForStability } from './helpers/testUtils';

import { ensureUserExists } from './helpers/user-mgmt';

test.describe.serial('Production 4-Role Setup & Login Verification', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
        // Use short random suffix to avoid length limits
        const suffix = Math.floor(Math.random() * 900000) + 100000;
        creds.support.username = `E2E_SUP_${suffix}`;
        creds.manager.username = `E2E_MGR_${suffix}`;
        creds.employee1.username = `E2E_EMP_${suffix}`;
        console.log(`🔧 Using dynamic users: ${creds.support.username}, ${creds.manager.username}, ${creds.employee1.username}`);
    });

    test('0️⃣ Setup: Create Test Users via Admin', async ({ page }) => {
        console.log('🔧 Starting User Setup... Login as Admin');
        await login(page, creds.admin);

        await page.goto('/app/admin/users', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        // Create users using the new robust helper
        // Note: Passing internal role codes (e.g. IT_SUPPORT). Helper will handle selection.
        await ensureUserExists(page, creds.support, 'IT_SUPPORT', 'E2E Support User');
        await ensureUserExists(page, creds.manager, 'MANAGER', 'E2E Manager User');
        await ensureUserExists(page, creds.employee1, 'EMPLOYEE', 'E2E Employee User');

        console.log('🔧 Setup Complete.');
        await logout(page);
    });

    test('1️⃣ Admin Login', async ({ page }) => {
        console.log('🔐 Testing Admin Login...');
        await login(page, creds.admin);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/admin/);
        await expect(page.locator('header').or(page.getByTestId('app-header')).first()).toBeVisible();
        console.log('✅ Admin login successful!');
        await logout(page);
    });

    test('2️⃣ IT Support Login', async ({ page }) => {
        console.log('🔐 Testing IT Support Login...');
        await login(page, creds.support);
        await waitForStability(page);
        // Expect IT Support dashboard (note: verifying actual URL from successful login)
        await expect(page).toHaveURL(/\/app\/(it-support|support)/);
        await expect(page.locator('header').or(page.getByTestId('app-header')).first()).toBeVisible();
        console.log('✅ IT Support login successful!');
        await logout(page);
    });

    test('3️⃣ Manager Login', async ({ page }) => {
        console.log('🔐 Testing Manager Login...');
        await login(page, creds.manager);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/manager/);
        await expect(page.locator('header').or(page.getByTestId('app-header')).first()).toBeVisible();
        console.log('✅ Manager login successful!');
        await logout(page);
    });

    test('4️⃣ Employee Login', async ({ page }) => {
        console.log('🔐 Testing Employee Login...');
        await login(page, creds.employee1);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/employee/);
        await expect(page.locator('header').or(page.getByTestId('app-header')).first()).toBeVisible();
        console.log('✅ Employee login successful!');
        await logout(page);
    });

    test('🎯 Sequential Full Cycle', async ({ page }) => {
        console.log('\n🎯 Testing ALL 4 ROLES in sequence...\n');

        // Admin
        console.log('1/4 🔐 Admin...');
        await login(page, creds.admin);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/admin/);
        console.log('    ✅ Admin OK');
        await logout(page);

        // IT Support
        console.log('2/4 🔐 IT Support...');
        await login(page, creds.support);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/(it-support|support)/);
        console.log('    ✅ IT Support OK');
        await logout(page);

        // Manager
        console.log('3/4 🔐 Manager...');
        await login(page, creds.manager);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/manager/);
        console.log('    ✅ Manager OK');
        await logout(page);

        // Employee
        console.log('4/4 🔐 Employee...');
        await login(page, creds.employee1);
        await waitForStability(page);
        await expect(page).toHaveURL(/\/app\/employee/);
        console.log('    ✅ Employee OK');
        await logout(page);

        console.log('\n🎉 ALL 4 ROLES LOGIN SUCCESSFUL!\n');
    });
});
