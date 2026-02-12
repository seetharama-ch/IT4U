import { test, expect } from '@playwright/test';

/**
 * Multi-Context Multi-User Login Test
 * 
 * Verifies that multiple users can login simultaneously using separate browser contexts.
 * Each context has isolated cookies, allowing different users to be authenticated in parallel.
 * 
 * This test demonstrates the solution to multi-tab isolation using Playwright contexts.
 */

test.describe('Multi-Context Multi-User Login', () => {
    test('should allow admin and employee to login in separate contexts', async ({ browser }) => {
        // Context 1: Admin User
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        await adminPage.goto('/login');
        await adminPage.fill('[data-testid="username-input"]', 'admin');
        await adminPage.fill('[data-testid="password-input"]', 'admin');
        await adminPage.click('[data-testid="login-submit"]');
        await adminPage.waitForURL('**/app/admin', { timeout: 10000 });

        // Verify admin is on admin dashboard
        expect(adminPage.url()).toContain('/app/admin');

        // Verify admin user data
        const adminUser = await adminPage.evaluate(async () => {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            return response.json();
        });
        expect(adminUser.role).toBe('ADMIN');
        expect(adminUser.username).toBe('admin');

        // Context 2: Employee User (separate session)
        const employeeContext = await browser.newContext();
        const employeePage = await employeeContext.newPage();

        await employeePage.goto('/login');
        await employeePage.fill('[data-testid="username-input"]', 'employee_john');
        await employeePage.fill('[data-testid="password-input"]', 'password');
        await employeePage.click('[data-testid="login-submit"]');
        await employeePage.waitForURL('**/app/employee', { timeout: 10000 });

        // Verify employee is on employee dashboard
        expect(employeePage.url()).toContain('/app/employee');

        // Verify employee user data
        const employeeUser = await employeePage.evaluate(async () => {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            return response.json();
        });
        expect(employeeUser.role).toBe('EMPLOYEE');
        expect(employeeUser.username).toBe('employee_john');

        // CRITICAL: Verify admin is STILL logged in (no session collision)
        await adminPage.reload();
        await adminPage.waitForURL('**/app/admin', { timeout: 10000 });
        expect(adminPage.url()).toContain('/app/admin');

        const adminUserAfterRefresh = await adminPage.evaluate(async () => {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            return response.json();
        });
        expect(adminUserAfterRefresh.role).toBe('ADMIN');
        expect(adminUserAfterRefresh.username).toBe('admin');

        // Verify employee is still logged in
        await employeePage.reload();
        await employeePage.waitForURL('**/app/employee', { timeout: 10000 });
        expect(employeePage.url()).toContain('/app/employee');

        // Verify sessions are independent (different cookies)
        const adminCookies = await adminContext.cookies();
        const employeeCookies = await employeeContext.cookies();

        const adminSessionCookie = adminCookies.find(c => c.name === 'JSESSIONID');
        const employeeSessionCookie = employeeCookies.find(c => c.name === 'JSESSIONID');

        expect(adminSessionCookie).toBeTruthy();
        expect(employeeSessionCookie).toBeTruthy();
        expect(adminSessionCookie.value).not.toBe(employeeSessionCookie.value);

        console.log('[Test] ✅ Multi-context isolation verified');
        console.log('  - Admin JSESSIONID:', adminSessionCookie.value.substring(0, 10) + '...');
        console.log('  - Employee JSESSIONID:', employeeSessionCookie.value.substring(0, 10) + '...');

        // Cleanup
        await adminContext.close();
        await employeeContext.close();
    });

    test('should allow manager and IT support to login in separate contexts', async ({ browser }) => {
        // Context 1: Manager
        const managerContext = await browser.newContext();
        const managerPage = await managerContext.newPage();

        await managerPage.goto('/login');
        await managerPage.fill('[data-testid="username-input"]', 'manager_alice');
        await managerPage.fill('[data-testid="password-input"]', 'password');
        await managerPage.click('[data-testid="login-submit"]');
        await managerPage.waitForURL('**/app/manager', { timeout: 10000 });

        // Context 2: IT Support
        const itContext = await browser.newContext();
        const itPage = await itContext.newPage();

        await itPage.goto('/login');
        await itPage.fill('[data-testid="username-input"]', 'support_bob');
        await itPage.fill('[data-testid="password-input"]', 'password');
        await itPage.click('[data-testid="login-submit"]');
        await itPage.waitForURL('**/app/it-support', { timeout: 10000 });

        // Verify both are logged in with correct roles
        const managerUser = await managerPage.evaluate(async () => {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            return response.json();
        });
        expect(managerUser.role).toBe('MANAGER');

        const itUser = await itPage.evaluate(async () => {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            return response.json();
        });
        expect(itUser.role).toBe('IT_SUPPORT');

        console.log('[Test] ✅ Manager and IT Support multi-context verified');

        // Cleanup
        await managerContext.close();
        await itContext.close();
    });

    test('should handle logout in one context without affecting another', async ({ browser }) => {
        // Create two contexts with same user
        const context1 = await browser.newContext();
        const page1 = await context1.newPage();

        await page1.goto('/login');
        await page1.fill('[data-testid="username-input"]', 'employee_john');
        await page1.fill('[data-testid="password-input"]', 'password');
        await page1.click('[data-testid="login-submit"]');
        await page1.waitForURL('**/app/employee', { timeout: 10000 });

        const context2 = await browser.newContext();
        const page2 = await context2.newPage();

        await page2.goto('/login');
        await page2.fill('[data-testid="username-input"]', 'employee_john');
        await page2.fill('[data-testid="password-input"]', 'password');
        await page2.click('[data-testid="login-submit"]');
        await page2.waitForURL('**/app/employee', { timeout: 10000 });

        // Both pages logged in
        expect(page1.url()).toContain('/app/employee');
        expect(page2.url()).toContain('/app/employee');

        // Logout from context 1
        // Find and click logout button (assuming it's in header)
        await page1.click('button:has-text("Logout"), [data-testid="logout-button"]');
        await page1.waitForURL('**/login', { timeout: 5000 });

        // Verify page1 is logged out
        expect(page1.url()).toContain('/login');

        // Verify page2 is STILL logged in (different context = different cookies)
        await page2.reload();
        await page2.waitForURL('**/app/employee', { timeout: 10000 });
        expect(page2.url()).toContain('/app/employee');

        console.log('[Test] ✅ Logout isolation between contexts verified');

        // Cleanup
        await context1.close();
        await context2.close();
    });
});
