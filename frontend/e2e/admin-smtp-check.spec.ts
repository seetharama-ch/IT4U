import { test, expect } from '@playwright/test';

test.describe('Admin SMTP Configuration Check', () => {

    test('Admin can trigger test email via API', async ({ request }) => {
        // 1. authenticate as Admin
        const loginResponse = await request.post('http://localhost:8081/api/auth/login', {
            data: {
                username: 'admin',
                password: 'password'
            }
        });

        expect(loginResponse.status()).toBe(200);

        // Save cookies (if needed, but request context usually persists them for subsequent calls in the same test)
        // Playwright's `request` fixture maintains state.

        // 2. Trigger Test Email
        // Note: Change 'to' address if you want to test receiving it.
        const emailResponse = await request.get('http://localhost:8081/api/admin/test-email', {
            params: {
                to: 'it4u-notify@geosoftglobal.com' // Sending to self/notification address as safe default
            }
        });

        // 3. Verify Success
        // If SMTP is not actually running/reachable from where this test runs, it might fail with 500.
        // But the user asked for a test that "validates API call returns 200".
        if (emailResponse.status() === 500) {
            console.log('Test Email failed (likely SMTP connection issue):', await emailResponse.text());
        }

        expect(emailResponse.status(), `Expected 200 OK but got ${emailResponse.status()} - ${await emailResponse.text()}`).toBe(200);
        expect(await emailResponse.text()).toContain('Test email sent to');
    });
});
