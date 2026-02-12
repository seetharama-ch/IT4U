import { test, expect } from '@playwright/test';
import { loginAsEmployee, loginAsManager, loginAsSupport } from './helpers/auth';
import {
    createTicketViaAPI,
    managerApproveViaAPI,
    supportMarkWIPViaAPI,
    supportResolveViaAPI,
    getTicketViaAPI
} from './helpers/tickets';

test.describe('Complete API Lifecycle Validation', () => {
    test('Full ticket lifecycle via API', async ({ page }) => {
        let ticketId: number;
        let ticketNumber: string;

        // ========== PHASE 1: Create Ticket ==========
        console.log('\n📝 PHASE 1: Employee creates ticket');
        await loginAsEmployee(page);

        const ticket = await createTicketViaAPI(page, {
            title: `E2E Full Lifecycle ${Date.now()}`,
            description: 'Complete lifecycle test via API',
            category: 'HARDWARE',
            priority: 'HIGH'
        });

        ticketId = ticket.id;
        ticketNumber = ticket.ticketNumber;
        console.log(`✅ Created: ${ticketNumber} (ID: ${ticketId})`);

        // ========== PHASE 2: Manager Approves ==========
        console.log('\n👔 PHASE 2: Manager approves ticket');
        await loginAsManager(page);

        await managerApproveViaAPI(page, ticketId, 'Approved for lifecycle test');

        let updatedTicket = await getTicketViaAPI(page, ticketId);
        expect(updatedTicket.status).toBe('OPEN');
        expect(updatedTicket.managerApprovalStatus).toBe('APPROVED');
        console.log(`✅ Approved: Status=${updatedTicket.status}`);

        // ========== PHASE 3: Support Marks WIP ==========
        console.log('\n🔧 PHASE 3: IT Support marks as WIP');
        await loginAsSupport(page);

        await supportMarkWIPViaAPI(page, ticketId);

        updatedTicket = await getTicketViaAPI(page, ticketId);
        expect(updatedTicket.status).toBe('IN_PROGRESS');
        console.log(`✅ WIP: Status=${updatedTicket.status}`);

        // ========== PHASE 4: Support Resolves ==========
        console.log('\n✅ PHASE 4: IT Support resolves ticket');

        await supportResolveViaAPI(page, ticketId, 'Resolved via API test');

        updatedTicket = await getTicketViaAPI(page, ticketId);
        expect(updatedTicket.status).toBe('RESOLVED');
        console.log(`✅ Resolved: Status=${updatedTicket.status}`);

        // ========== FINAL VERIFICATION ==========
        console.log('\n🎯 FINAL: Full lifecycle complete!');
        console.log(`   Ticket: ${ticketNumber}`);
        console.log(`   Journey: PENDING → OPEN → IN_PROGRESS → RESOLVED`);
        console.log(`   ✅ All API operations successful!`);
    });
});
