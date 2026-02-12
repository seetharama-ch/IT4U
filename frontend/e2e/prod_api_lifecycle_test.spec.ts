import { test, expect } from '@playwright/test';
import { loginAsEmployee, loginAsManager, loginAsSupport } from './helpers/auth';
import {
    createTicketViaAPI,
    managerApproveViaAPI,
    supportMarkWIPViaAPI,
    supportResolveViaAPI,
    getTicketViaAPI
} from './helpers/tickets';

test.describe('API-Based Ticket Lifecycle (Stability Test)', () => {
    let ticketId: number;
    let ticketNumber: string;

    test('Phase 1: Employee creates ticket via API', async ({ page }) => {
        await loginAsEmployee(page);

        // ✅ API for mutation
        const ticket = await createTicketViaAPI(page, {
            title: `E2E API Test ${Date.now()}`,
            description: 'Testing API-based ticket creation',
            category: 'HARDWARE',
            priority: 'HIGH'
        });

        ticketId = ticket.id;
        ticketNumber = ticket.ticketNumber;

        // ✅ UI for verification only
        await page.goto('/app/my-tickets');
        await expect(page.locator(`text=${ticketNumber}`)).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=PENDING')).toBeVisible();

        console.log(`✓ Phase 1 Complete: Ticket ${ticketNumber} created`);
    });

    test('Phase 2: Manager approves via API', async ({ page }) => {
        test.skip(!ticketId, 'Ticket ID not available from Phase 1');

        await loginAsManager(page);

        // ✅ API for mutation
        await managerApproveViaAPI(page, ticketId, 'API approval test');

        // ✅ Verify via API
        const updatedTicket = await getTicketViaAPI(page, ticketId);
        expect(updatedTicket.status).toBe('APPROVED');

        // ✅ UI verification
        await page.goto('/app/approvals');
        await page.reload(); // Refresh to see latest
        await expect(page.locator(`text=${ticketNumber}`)).toBeVisible({ timeout: 10000 });

        console.log(`✓ Phase 2 Complete: Ticket ${ticketNumber} approved`);
    });

    test('Phase 3: IT Support processes via API', async ({ page }) => {
        test.skip(!ticketId, 'Ticket ID not available from Phase 1');

        await loginAsSupport(page);

        // ✅ Mark as WIP
        await supportMarkWIPViaAPI(page, ticketId);
        let ticket = await getTicketViaAPI(page, ticketId);
        expect(ticket.status).toBe('IN_PROGRESS');

        // ✅ Resolve
        await supportResolveViaAPI(page, ticketId, 'API resolution test');
        ticket = await getTicketViaAPI(page, ticketId);
        expect(ticket.status).toBe('RESOLVED');

        // ✅ UI verification
        await page.goto('/app/assigned');
        await page.reload();
        await expect(page.locator(`text=${ticketNumber}`)).toBeVisible({ timeout: 10000 });

        console.log(`✓ Phase 3 Complete: Ticket ${ticketNumber} resolved`);
    });
});
