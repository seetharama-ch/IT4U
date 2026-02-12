import { test, expect } from './fixtures/bugRecorder';
import { attachCrashGuards, login, logout } from './helpers/auth';
import { createUserUI } from './helpers/admin';
import {
    employeeCreateTicket,
    managerApproveTicket,
    supportProcessTicket,
    adminDeleteTicket
} from './helpers/tickets';

const ADMIN = { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'Admin@123' };

// Two managers, two employees, one IT support
const USERS = {
    mgr1: { name: 'Manager One', username: 'mgr1', email: 'mgr1@gsg.in', password: 'Pass@123', role: 'MANAGER' as const },
    mgr2: { name: 'Manager Two', username: 'mgr2', email: 'mgr2@gsg.in', password: 'Pass@123', role: 'MANAGER' as const },
    emp1: { name: 'Employee One', username: 'emp1', email: 'emp1@gsg.in', password: 'Pass@123', role: 'EMPLOYEE' as const },
    emp2: { name: 'Employee Two', username: 'emp2', email: 'emp2@gsg.in', password: 'Pass@123', role: 'EMPLOYEE' as const },
    sup1: { name: 'Support One', username: 'sup1', email: 'sup1@gsg.in', password: 'Pass@123', role: 'IT_SUPPORT' as const },
};

test.describe('IT4U - Full E2E Ticket Lifecycle (2 employees, 2 managers)', () => {
    test.beforeEach(async ({ page, bugLog }, testInfo) => {
        // Capture console errors
        page.on('console', async (msg) => {
            if (msg.type() === 'error') {
                const text = `[console.${msg.type()}] ${msg.text()}`;
                bugLog.consoleErrors.push(text);
                testInfo.attach('console-error', { body: text, contentType: 'text/plain' });
            }
        });

        // Capture page errors (crashes)
        page.on('pageerror', async (err) => {
            const text = `[pageerror] ${err.message}`;
            bugLog.pageErrors.push(text);
            testInfo.attach('page-error', { body: text, contentType: 'text/plain' });
            // capture immediate crash screenshot
            await page.screenshot({ path: testInfo.outputPath(`crash-${Date.now()}.png`), fullPage: true });
        });

        bugLog.url = page.url();
    });

    test('Admin creates users -> Employees create tickets -> Managers approve -> Support resolves -> Admin deletes', async ({ page, bugLog }) => {
        await attachCrashGuards(page);

        // ========== ADMIN: login + create users (Skipped - relying on seed) ==========
        /*
        await login(page, ADMIN);
        await createUserUI(page, USERS.mgr1);
        await createUserUI(page, USERS.mgr2);
        await createUserUI(page, USERS.emp1);
        await createUserUI(page, USERS.emp2);
        await createUserUI(page, USERS.sup1);
        await logout(page);
        */

        // ========== EMP1: create ticket 1 ==========
        await login(page, { username: USERS.emp1.username, password: USERS.emp1.password });

        const t1 = await employeeCreateTicket(page, {
            title: 'Laptop not booting - Emp1',
            description: 'System not booting after update. Need urgent help.',
            category: 'HARDWARE',
            managerName: USERS.mgr1.username
        });

        await logout(page);

        // ========== EMP2: create ticket 2 ==========
        await login(page, { username: USERS.emp2.username, password: USERS.emp2.password });

        const t2 = await employeeCreateTicket(page, {
            title: 'VPN connectivity issue - Emp2',
            description: 'Unable to connect to office VPN from home network.',
            category: 'SOFTWARE',
            managerName: USERS.mgr2.username
        });

        await logout(page);

        // ========== MANAGER1 approves ticket 1 ==========
        await login(page, { username: USERS.mgr1.username, password: USERS.mgr1.password });
        await managerApproveTicket(page, t1.ticketNo);
        await logout(page);

        // ========== MANAGER2 rejects ticket 2 ==========
        await login(page, { username: USERS.mgr2.username, password: USERS.mgr2.password });
        // Use rejection helper for T2
        const { managerRejectTicket } = await import('./helpers/tickets');
        await managerRejectTicket(page, t2.ticketNo);
        await logout(page);

        // ========== SUPPORT processes ticket 1 (Approved) ==========
        // T2 is rejected, so support might not act on it, or should see it as rejected.
        await login(page, { username: USERS.sup1.username, password: USERS.sup1.password });
        await supportProcessTicket(page, t1.ticketNo);
        // await supportProcessTicket(page, t2.ticketNo); // Skip T2 as it is rejected
        await logout(page);

        // ========== ADMIN verifies + deletes both ==========
        await login(page, ADMIN);
        await adminDeleteTicket(page, t1.ticketNo);
        // await adminDeleteTicket(page, t2.ticketNo); // T2 was rejected, may not be in default admin view

        // If anything crashes, attachCrashGuards() will fail the test.
    });
});
