import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';

/**
 * Production E2E: Full Ticket Lifecycle (API-First Approach)
 * 
 * Tests complete workflow from employee ticket creation through manager approval,
 * IT support resolution, and admin audit/delete.
 * 
 * Uses API for state changes and UI for verification only (stable approach).
 */

const BASE_URL = process.env.BASE_URL || 'https://gsg-mecm';
const TIMESTAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);

interface UserSession {
    username: string;
    password: string;
    cookies?: Cookie[];
}

const USERS = {
    admin: { username: 'admin', password: 'Admin@123' },
    employee: { username: `E2E_${TIMESTAMP}_EMP`, password: 'Password@123', role: 'EMPLOYEE' },
    manager: { username: `E2E_${TIMESTAMP}_MGR`, password: 'Password@123', role: 'MANAGER' },
    support: { username: `E2E_${TIMESTAMP}_SUP`, password: 'Password@123', role: 'IT_SUPPORT' }
};

test.describe('Full Ticket Lifecycle E2E Suite', () => {
    let sessions: { [key: string]: UserSession } = {};
    let testTicketId: number;
    let testTicketNumber: string;
    let rejectedTicketId: number;

    test.beforeAll(async ({ browser, request }) => {
        // 1. Login as Admin to create other users
        const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
        const adminPage = await adminContext.newPage();
        await adminPage.goto(`${BASE_URL}/login`);
        await adminPage.fill('input[name="username"]', USERS.admin.username);
        await adminPage.fill('input[name="password"]', USERS.admin.password);
        await adminPage.click('button[type="submit"]');
        await adminPage.waitForURL(/\/app\/(admin|tickets)/);
        const adminCookies = await adminContext.cookies();

        sessions['admin'] = {
            ...USERS.admin,
            cookies: adminCookies
        };
        console.log('✅ Admin logged in');

        // 2. Create E2E users via API
        for (const [role, creds] of Object.entries(USERS)) {
            if (role === 'admin') continue;

            const createRes = await request.post(`${BASE_URL}/api/users`, {
                headers: {
                    Cookie: adminCookies.map(c => `${c.name}=${c.value}`).join('; ')
                },
                data: {
                    username: creds.username,
                    fullName: `E2E ${role} ${TIMESTAMP}`,
                    email: `${creds.username}@test.local`,
                    password: creds.password,
                    role: (creds as any).role,
                    active: true
                }
            });

            if (createRes.status() === 409) {
                console.log(`⚠️ User ${creds.username} already exists`);
            } else {
                expect(createRes.ok()).toBeTruthy();
                console.log(`✅ User ${creds.username} created`);
            }
        }
        await adminContext.close();

        // 3. Login everyone else to get sessions
        for (const [role, credentials] of Object.entries(USERS)) {
            if (role === 'admin') continue;
            const context = await browser.newContext({ ignoreHTTPSErrors: true });
            const page = await context.newPage();

            await page.goto(`${BASE_URL}/login`);
            await page.fill('input[name="username"]', credentials.username);
            await page.fill('input[name="password"]', credentials.password);
            await page.click('button[type="submit"]');

            await page.waitForURL(/\/app\/(employee|manager|support|admin|tickets)/);

            sessions[role] = {
                ...credentials,
                cookies: await context.cookies()
            };

            console.log(`✅ ${role} logged in: ${credentials.username}`);
            await context.close();
        }
    });

    test.describe('Positive Scenario', () => {
        test('1. Employee creates ticket', async ({ request, page }) => {
            const employee = sessions.employee;
            const response = await request.post(`${BASE_URL}/api/tickets`, {
                headers: {
                    Cookie: employee.cookies!.map(c => `${c.name}=${c.value}`).join('; ')
                },
                data: {
                    title: `E2E_TEST_${TIMESTAMP}_Positive`,
                    description: 'Full lifecycle test ticket - should be approved and resolved',
                    category: 'SOFTWARE',
                    requester: { username: employee.username }
                }
            });

            expect(response.ok()).toBeTruthy();
            const ticket = await response.json();
            testTicketId = ticket.id;
            testTicketNumber = ticket.ticketNumber || `#${ticket.id}`;
            console.log(`✅ Ticket created: ${testTicketNumber}`);

            await page.goto(`${BASE_URL}/login`);
            await page.fill('input[name="username"]', employee.username);
            await page.fill('input[name="password"]', employee.password);
            await page.click('button[type="submit"]');
            await page.waitForURL(/\/app\/(employee|tickets)/);
            await expect(page.locator(`text=${testTicketNumber}`)).toBeVisible();
        });

        test('2. Manager approves ticket', async ({ request }) => {
            const manager = sessions.manager;
            const response = await request.post(`${BASE_URL}/api/tickets/${testTicketId}/approve`, {
                headers: {
                    Cookie: manager.cookies!.map(c => `${c.name}=${c.value}`).join('; ')
                },
                data: { priority: 'HIGH', comment: 'Approved by E2E' }
            });
            expect([200, 201]).toContain(response.status());
            console.log('✅ Ticket approved');
        });

        test('3. IT Support resolves ticket', async ({ request }) => {
            const support = sessions.support;

            // Assign
            await request.patch(`${BASE_URL}/api/tickets/${testTicketId}/status`, {
                headers: { Cookie: support.cookies!.map(c => `${c.name}=${c.value}`).join('; ') },
                data: { status: 'IN_PROGRESS' }
            });

            // Resolve
            const res = await request.patch(`${BASE_URL}/api/tickets/${testTicketId}/status`, {
                headers: { Cookie: support.cookies!.map(c => `${c.name}=${c.value}`).join('; ') },
                data: { status: 'RESOLVED' }
            });
            expect(res.ok()).toBeTruthy();
            console.log('✅ Ticket resolved');
        });

        test('4. Admin deletes ticket', async ({ request }) => {
            const admin = sessions.admin;
            const res = await request.delete(`${BASE_URL}/api/tickets/${testTicketId}`, {
                headers: { Cookie: admin.cookies!.map(c => `${c.name}=${c.value}`).join('; ') }
            });
            expect([200, 204]).toContain(res.status());
            console.log('✅ Ticket deleted');
        });
    });

    test.describe('Negative Scenario (Rejection)', () => {
        test('1. Employee creates ticket for rejection', async ({ request }) => {
            const employee = sessions.employee;
            const response = await request.post(`${BASE_URL}/api/tickets`, {
                headers: { Cookie: employee.cookies!.map(c => `${c.name}=${c.value}`).join('; ') },
                data: {
                    title: `E2E_TEST_${TIMESTAMP}_Negative`,
                    description: 'Test ticket - should be rejected',
                    category: 'HARDWARE',
                    requester: { username: employee.username }
                }
            });
            const ticket = await response.json();
            rejectedTicketId = ticket.id;
            console.log(`✅ Ticket created for rejection: #${rejectedTicketId}`);
        });

        test('2. Manager rejects ticket', async ({ request }) => {
            const manager = sessions.manager;
            const response = await request.patch(`${BASE_URL}/api/tickets/${rejectedTicketId}/approval`, {
                headers: { Cookie: manager.cookies!.map(c => `${c.name}=${c.value}`).join('; ') },
                data: { managerApprovalStatus: 'REJECTED', comment: 'Rejected by E2E' }
            });
            expect(response.ok()).toBeTruthy();
            console.log('✅ Ticket rejected');
        });

        test('3. Admin cleans up rejected ticket', async ({ request }) => {
            const admin = sessions.admin;
            const res = await request.delete(`${BASE_URL}/api/tickets/${rejectedTicketId}`, {
                headers: { Cookie: admin.cookies!.map(c => `${c.name}=${c.value}`).join('; ') }
            });
            expect([200, 204]).toContain(res.status());
            console.log('✅ Rejected ticket deleted');
        });
    });
});
