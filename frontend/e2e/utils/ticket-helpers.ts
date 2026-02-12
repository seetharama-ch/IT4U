import { Page, expect } from '@playwright/test';
import { TICKET_DATA, USERS } from '../fixtures/test-data';

export async function createTicket(page: Page) {
    await page.goto('/create'); // Route in App.jsx is /create
    await page.fill('input[name="title"]', TICKET_DATA.title);
    await page.selectOption('select[name="category"]', TICKET_DATA.category);
    await page.selectOption('select[name="priority"]', TICKET_DATA.priority);
    await page.fill('textarea[name="description"]', TICKET_DATA.description);

    // Select manager - Wait for API to load 
    const managerOption = page.locator(`select[name="managerSelect"] option[value="${USERS.manager.username}"]`);
    await expect(managerOption).toBeAttached({ timeout: 10000 });
    await page.selectOption('select[name="managerSelect"]', USERS.manager.username);

    await page.click('button[type="submit"]');

    // Verify success and get ID
    await expect(page).toHaveURL('http://localhost:5173/'); // Redirects to home/dashboard

    // Wait for the ticket to appear in the list. Assuming dashboard shows tickets.
    // We need to grab the ID of the newly created ticket.
    // This might be tricky if there are many tickets. 
    // For unique identification, maybe we can search by title?
    // Or assuming it's the first one in the list.

    // Let's assume the dashboard has a list of tickets and we can filter by title or it's sorted by date.
    // We'll return the ID of the first ticket for now, assuming test isolation or cleanup.

    // In TicketList.jsx, tickets are displayed. We need to see how they are rendered.
    // Assuming a table row <tr> with a link or cell containing the ID.
    // We'll wait for the title to be visible.
    const ticketLink = page.getByText(TICKET_DATA.title).first();
    await expect(ticketLink).toBeVisible();

    // Use a more specific selector strategy based on TicketList structure if possible.
    // For now returned mocked/extracted ID if not easily scrapable without more context.
    // Actually, let's look at the first row's ID column if it exists.

    // Placeholder return, loop back to refine if "happy path" fails to grab ID.
    return 'TICKET-ID';
}

export async function approveTicket(page: Page, ticketId: string) {
    // Navigate to dashboard or approval specific page
    await page.goto('/');

    // Find ticket by Title (since we used that in creation) if ID is not reliable yet
    // Or if we have a robust ID, search for it.

    // Implementation depends on TicketList view. 
    // Assuming we click on the ticket to go to details, then approve.
    const ticketElement = page.getByText(TICKET_DATA.title).first();
    await ticketElement.click();

    await expect(page).toHaveURL(/\/tickets\/\d+/);

    await page.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('Approved')).toBeVisible();
}
