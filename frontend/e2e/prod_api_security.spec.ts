/**
 * Production API Security Tests
 * Role-based access control validation
 */

import { test, expect } from '@playwright/test';
import { getAPIBaseURL, loadProdCredentials } from './helpers/testUtils';

test.describe('Production API Security', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('Unauthenticated requests to protected endpoints return 401', async ({ request }) => {
        const endpoints = [
            '/api/users',
            '/api/tickets',
            '/api/admin/system/health',
        ];

        for (const endpoint of endpoints) {
            const response = await request.get(`${getAPIBaseURL()}${endpoint}`, {
                ignoreHTTPSErrors: true
            });

            expect(response.status()).toBe(401);
        }
    });

    test('Employee cannot access admin user endpoints', async ({ request }) => {
        // Login as employee
        const loginResp = await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.employee1.username,
                password: creds.employee1.password
            },
            ignoreHTTPSErrors: true
        });
        expect(loginResp.ok()).toBe(true);

        // Try to access admin endpoints
        const userListResp = await request.get(`${getAPIBaseURL()}/users`, {
            ignoreHTTPSErrors: true
        });

        // Should be forbidden (403) or unauthorized (401), but NOT success (200)
        expect([401, 403]).toContain(userListResp.status());
    });

    test('Employee cannot create users', async ({ request }) => {
        // Login as employee
        await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.employee1.username,
                password: creds.employee1.password
            },
            ignoreHTTPSErrors: true
        });

        // Try to create user
        const createUserResp = await request.post(`${getAPIBaseURL()}/users`, {
            data: {
                username: 'hacker_test',
                password: 'Password@123',
                role: 'ADMIN'
            },
            ignoreHTTPSErrors: true
        });

        expect([401, 403]).toContain(createUserResp.status());
    });

    test('Manager cannot delete users', async ({ request }) => {
        // Login as manager
        await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.manager.username,
                password: creds.manager.password
            },
            ignoreHTTPSErrors: true
        });

        // Try to delete a user (use a fake ID)
        const deleteUserResp = await request.delete(`${getAPIBaseURL()}/users/999`, {
            ignoreHTTPSErrors: true
        });

        expect([401, 403, 404]).toContain(deleteUserResp.status());
    });

    test('IT Support cannot create users', async ({ request }) => {
        // Login as IT support
        await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.support.username,
                password: creds.support.password
            },
            ignoreHTTPSErrors: true
        });

        // Try to create user
        const createUserResp = await request.post(`${getAPIBaseURL()}/users`, {
            data: {
                username: 'hacker_support',
                password: 'Password@123',
                role: 'ADMIN'
            },
            ignoreHTTPSErrors: true
        });

        expect([401, 403]).toContain(createUserResp.status());
    });

    test('No endpoint returns 500 error for valid requests', async ({ request }) => {
        // Login as admin
        await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.admin.username,
                password: creds.admin.password
            },
            ignoreHTTPSErrors: true
        });

        const endpoints = [
            '/api/auth/me',
            '/api/users',
            '/api/tickets'
        ];

        for (const endpoint of endpoints) {
            const response = await request.get(`${getAPIBaseURL()}${endpoint}`, {
                ignoreHTTPSErrors: true
            });

            expect(response.status()).not.toBe(500);
            expect(response.status()).toBeLessThan(500);
        }
    });

    test('Session persists after ticket operations', async ({ request }) => {
        // Login as employee
        const loginResp = await request.post(`${getAPIBaseURL()}/auth/login`, {
            data: {
                username: creds.employee1.username,
                password: creds.employee1.password
            },
            ignoreHTTPSErrors: true
        });
        expect(loginResp.ok()).toBe(true);

        // Get tickets
        const ticketsResp = await request.get(`${getAPIBaseURL()}/tickets`, {
            ignoreHTTPSErrors: true
        });
        expect(ticketsResp.ok()).toBe(true);

        // Verify session still valid
        const meResp = await request.get(`${getAPIBaseURL()}/auth/me`, {
            ignoreHTTPSErrors: true
        });
        expect(meResp.ok()).toBe(true);
        expect(meResp.status()).toBe(200);
    });
});
