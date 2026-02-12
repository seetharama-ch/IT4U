import { test, expect } from '@playwright/test';

/**
 * Production Setup: Create E2E Test Users
 * 
 * Creates test users for comprehensive E2E testing.
 * Uses timestamp-based naming to avoid conflicts.
 */

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';
const TIMESTAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13); // YYYYMMDDTHHMM

interface TestUser {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: string;
}

const TEST_USERS: TestUser[] = [
    {
        username: `E2E_${TIMESTAMP}_EMP_1`,
        fullName: 'E2E Employee One',
        email: `e2e_emp1_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'EMPLOYEE'
    },
    {
        username: `E2E_${TIMESTAMP}_EMP_2`,
        fullName: 'E2E Employee Two',
        email: `e2e_emp2_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'EMPLOYEE'
    },
    {
        username: `E2E_${TIMESTAMP}_MGR_1`,
        fullName: 'E2E Manager One',
        email: `e2e_mgr1_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'MANAGER'
    },
    {
        username: `E2E_${TIMESTAMP}_MGR_2`,
        fullName: 'E2E Manager Two',
        email: `e2e_mgr2_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'MANAGER'
    },
    {
        username: `E2E_${TIMESTAMP}_SUP_1`,
        fullName: 'E2E IT Support One',
        email: `e2e_sup1_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'IT_SUPPORT'
    },
    {
        username: `E2E_${TIMESTAMP}_SUP_2`,
        fullName: 'E2E IT Support Two',
        email: `e2e_sup2_${TIMESTAMP}@test.local`,
        password: 'Password@123',
        role: 'IT_SUPPORT'
    }
];

test.describe('Setup E2E Test Users', () => {
    let adminCookies;

    test.beforeAll(async ({ browser }) => {
        // Login as admin
        const context = await browser.newContext({
            ignoreHTTPSErrors: true
        });
        const page = await context.newPage();

        console.log('Logging in as admin...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Admin@123');
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/app\/(admin|tickets)/);
        console.log('✅ Admin login successful');

        adminCookies = await context.cookies();
        await context.close();
    });

    for (const user of TEST_USERS) {
        test(`should create test user: ${user.username}`, async ({ request }) => {
            const response = await request.post(`${BASE_URL}/api/users`, {
                headers: {
                    Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; '),
                    'Content-Type': 'application/json'
                },
                data: {
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    password: user.password,
                    role: user.role,
                    active: true
                }
            });

            // Accept 200 (created) or 409 (already exists)
            if (response.status() === 409) {
                console.log(`⚠️  User ${user.username} already exists (skipping)`);
            } else {
                expect(response.ok()).toBeTruthy();
                const created = await response.json();
                console.log(`✅ Created user: ${created.username} (${created.role})`);
            }
        });
    }

    test('should verify all users can login', async ({ browser }) => {
        for (const user of TEST_USERS) {
            const context = await browser.newContext({
                ignoreHTTPSErrors: true
            });
            const page = await context.newPage();

            console.log(`Testing login for ${user.username}...`);

            await page.goto(`${BASE_URL}/login`);
            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="password"]', user.password);
            await page.click('button[type="submit"]');

            // Should redirect to appropriate dashboard
            await page.waitForURL(/\/app\/(employee|manager|support|admin|tickets)/, { timeout: 10000 });

            console.log(`✅ ${user.username} login successful`);

            await context.close();
        }
    });

    test.afterAll(async () => {
        // Store created users for other tests
        const userCredentials = JSON.stringify(TEST_USERS, null, 2);
        console.log('\n========== E2E TEST USERS CREATED ==========');
        console.log(userCredentials);
        console.log('=========================================== ====\n');

        // Optionally write to a shared file
        const fs = require('fs');
        const path = require('path');
        const outputFile = path.join(__dirname, `e2e_users_${TIMESTAMP}.json`);
        fs.writeFileSync(outputFile, userCredentials);
        console.log(`User credentials saved to: ${outputFile}`);
    });
});

// Export for use in other tests
export { TEST_USERS, TIMESTAMP };
