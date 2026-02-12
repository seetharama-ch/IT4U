import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function login(page: Page, username: string, password: string) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**');
}

test('Admin can delete ticket from Ticket Details page', async ({ page }) => {
    // 1. Login as Admin
    await login(page, 'admin', 'password');

    // 2. Create a temporary ticket to delete
    await page.goto(`${BASE_URL}/app/tickets/new`);
    const timestamp = Date.now();
    await page.fill('[data-testid="ticket-title"]', `Delete Test ${timestamp}`);
    await page.selectOption('[data-testid="ticket-category"]', 'SOFTWARE');
    await page.fill('[data-testid="ticket-description"]', "Content to delete");
    await page.click('[data-testid="ticket-submit"]');
    await page.click('[data-testid="ticket-success-ok"]');

    // 3. Go to Ticket Dashboard and find the ticket
    await page.goto(`${BASE_URL}/app/admin`);
    const row = page.locator('tr').filter({ hasText: `Delete Test ${timestamp}` }).first();
    await expect(row).toBeVisible();

    // 4. Click View to open Details (Drawer or Page)
    await row.getByText('View').click();

    // 5. Assert we are in Details view
    // The details view usually has the ticket title in header
    await expect(page.locator('h3', { hasText: `Delete Test ${timestamp}` })).toBeVisible();

    // 6. Click Delete button in Details view
    const deleteBtn = page.getByRole('button', { name: 'Delete Ticket' }); // Assuming label
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // 7. Confirm deletion
    // Assuming a confirm dialog appears
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    // 8. Assert Success Toast
    await expect(page.locator('.Toastify, .go3963613292')).toContainText(/deleted successfully/i);

    // 9. Assert Navigation back to list and Ticket is gone
    // Check URL or simple visibility
    // If it was a drawer, maybe we are still on /app/admin but ticket is gone? 
    // This test assumes standard behavior. Adjust if it is a drawer.

    // Reload page to be sure
    await page.reload();
    await expect(page.locator('tr').filter({ hasText: `Delete Test ${timestamp}` })).not.toBeVisible();
});
