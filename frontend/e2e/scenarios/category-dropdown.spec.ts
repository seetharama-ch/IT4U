
import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/login-helpers';

test('Category dropdown contains each category only once', async ({ page }) => {
    // 1. Login as admin
    await loginAs(page, 'admin');

    // 2. Navigate to "Create Service Request"
    // Assuming the user navigates by clicking a link or button. 
    // Based on CreateTicket.jsx line 225: "Create Service Request" is an h1.
    // There is usually a link in the dashboard to create a ticket.
    await page.click('a[href="/app/tickets/new"]');

    await expect(page.getByText(/^Create Service Request$/i)).toBeVisible();

    // 3. Open category dropdown
    const select = page.locator('select[name="category"]');
    // Just checking options directly without clicking might be easier for non-interactive check,
    // but let's follow the user's flow more closely or simply evaluate the DOM.

    // 4. Grab all options
    const options = await select.evaluate((sel: HTMLSelectElement) => {
        return Array.from(sel.options).map(o => o.text.trim());
    });

    // Filter out placeholder
    const filtered = options.filter(text => text && !/select category/i.test(text));

    // 5. Check for duplicates
    const seen: Record<string, number> = {};
    for (const cat of filtered) {
        seen[cat] = (seen[cat] || 0) + 1;
    }

    // Assert "Access & Microsoft 365" (exact label) appears once
    expect(seen['Access & Microsoft 365']).toBe(1);

    // Assert no category appears more than once
    for (const [name, count] of Object.entries(seen)) {
        expect(count, `Category "${name}" is duplicated`).toBe(1);
    }
});
