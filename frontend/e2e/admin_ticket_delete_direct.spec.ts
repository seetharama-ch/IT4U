import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Admin Ticket Delete - Direct Verification
 * Uses data-testid and 'OTHERS' category to avoid manager selection validation issues.
 * Implements "Gold Standard" deterministic reset and network waits.
 */

// Global CSS to disable animations/transitions
test.beforeEach(async ({ page }) => {
    // 3.6 Disable animations
    await page.addStyleTag({
        content: `* { transition-duration: 0ms !important; animation-duration: 0ms !important; }`
    });
});

test.describe('Admin Ticket Delete Flow', () => {

    test.beforeEach(async ({ page, request }) => {
        // Debugging logs
        page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));

        // 2.1 Use API reset+seed (Deterministic State)

        // 2.2 Health Check Gate
        const health = await request.get('http://localhost:8060/actuator/health');
        expect(health.ok(), "Backend must be UP").toBeTruthy();

        // 1. Authenticate for API (need token or session? Backend uses Session with cookies)
        // Since we are running request from Playwright, we need to log in via API First to get the session cookie?
        // Or we can use the `loginAsAdmin` helper UI first, then use `request` which shares storageState?
        // Actually, request context in Playwright is separate unless configured.
        // But our backend is open for the reset/seed endpoints? No, they require ADMIN role.

        // Let's do a quick API login to get the cookie for the request context
        const loginResp = await request.post('http://localhost:8060/api/auth/login', {
            data: { username: 'admin', password: 'Admin@123' },
            headers: { 'Content-Type': 'application/json' }
        });
        expect(loginResp.ok(), "API Login failed").toBeTruthy();

        // RESET
        const resetResp = await request.post('http://localhost:8060/api/admin/system/reset');
        if (!resetResp.ok()) {
            console.log('Reset Failed:', resetResp.status(), await resetResp.text());
        }
        expect(resetResp.ok(), "System Reset failed").toBeTruthy();

        // SEED
        const seedResp = await request.post('http://localhost:8060/api/admin/system/seed-default');
        if (!seedResp.ok()) {
            console.log('Seed Failed:', seedResp.status(), await seedResp.text());
        }
        expect(seedResp.ok(), "User Seed failed").toBeTruthy();

        // Now Login UI for the actual test
        await loginAsAdmin(page);
    });

    /**
     * Test A: Create -> Delete (Admin)
     */
    test('should allow admin to create and hard delete a ticket', async ({ page, request }) => {

        // --- CREATE TICKET ---
        await page.goto('/app/tickets/new');

        // 3.1 Visibility check
        await expect(page.getByTestId('ticket-title')).toBeVisible();

        const uniqueTitle = `Admin Delete Test ${Date.now()}`;
        await page.getByTestId('ticket-title').fill(uniqueTitle);
        await page.getByTestId('ticket-description').fill('Testing Hard Delete');

        // 3.4 Deterministic Category
        await page.getByTestId('ticket-category').selectOption('OTHERS');

        // 3.3 Network Wait for Create
        const createPromise = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') && (resp.status() === 200 || resp.status() === 201)
        );
        await page.getByTestId('ticket-submit').click();
        const createResp = await createPromise;
        const ticketData = await createResp.json();
        const ticketId = ticketData.id;
        console.log(`Created Ticket ID: ${ticketId}`);

        // Handle Success Modal
        await expect(page.getByTestId('ticket-success-modal')).toBeVisible();
        await page.getByTestId('ticket-success-ok').click();

        // --- VERIFY LIST ---
        // 3.5 Ensure refresh/navigation
        // Go to Admin Dashboard
        await page.goto('/app/admin');

        // Ensure backend call returns 200
        await page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') && resp.status() === 200
        );

        // Apply Filter if needed (default might be APPROVED, ours is PENDING since OTHERS category)
        // Check TicketList.jsx: const [adminFilter, setAdminFilter] = useState('APPROVED');
        // So we MUST switch to Pending
        const pendingBtn = page.getByTestId('admin-filter-pending');
        await expect(pendingBtn).toBeVisible();

        const filterPromise = page.waitForResponse(resp =>
            resp.url().includes('/api/tickets') && resp.status() === 200
        );
        await pendingBtn.click();
        await filterPromise;

        // Assert Row Exists
        // Using text locator for the unique title is safest
        const row = page.locator(`tr:has-text("${uniqueTitle}")`);
        await expect(row).toBeVisible();

        // --- DELETE TICKET ---
        const deleteBtn = row.getByTestId('ticket-delete-btn');
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Convert delete confirmation to Promise
        const deleteApiPromise = page.waitForResponse(resp =>
            resp.url().includes(`/api/tickets/${ticketId}`) &&
            (resp.status() === 200 || resp.status() === 204)
        );

        // Modal should appear
        await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();
        await page.getByTestId('confirm-delete-btn').click();

        // Wait for API
        await deleteApiPromise;

        // Assert Row Removed
        await expect(row).not.toBeVisible();

        // --- UI SAFETY CHECK ---
        await expect(page.getByTestId('app-header')).toBeVisible();
    });

    /**
     * Test B: 404 UI for Deleted Ticket
     */
    test('should show correct 404 UI for deleted ticket', async ({ page, request }) => {
        // Manually create a ticket to delete via API
        // We know from beforeEach that we are logged in as admin for API requests
        const createResp = await request.post('http://localhost:8060/api/tickets', {
            data: {
                title: 'To Be Deleted',
                description: 'Verify 404',
                category: 'OTHERS',
                priority: 'LOW',
                requester: { username: 'admin' }, // Assuming admin can create
                managerName: 'admin' // Self-approve/bypass logic
            }
        });
        // Note: Creating ticket via request might fail if validation requirements (requester) aren't perfect
        // A safer way is to use the UI again, or trust the createTicket helper if we had one.
        // Let's try the request approach with basic fields. 
        // TicketService.createTicket requires requester. hydrateRequester looks up by ID or Username.
        // Admin is seeded.

        expect(createResp.ok(), "Setup: API Create failed").toBeTruthy();
        const ticket = await createResp.json();
        const id = ticket.id;

        // HARD DELETE via API
        await request.delete(`http://localhost:8060/api/tickets/${id}`);

        // Navigate to Details URL
        await page.goto(`/app/tickets/${id}`);

        // Assert "Ticket Not Found"
        await expect(page.locator('text=Ticket Not Found')).toBeVisible({ timeout: 10000 });

        // Assert Header Visible (No Grey Screen)
        await expect(page.getByTestId('app-header')).toBeVisible();
    });

});
