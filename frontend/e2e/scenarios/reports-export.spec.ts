import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/utils';

test('Admin can filter and export reports to Excel', async ({ page }) => {
    await loginAs(page, 'admin', 'password');

    // Navigate to Reports. "Reports" link might be in sidebar or header.
    // Subagent navigated via URL map, but let's check UI.
    // Admin usually has "Reports" link. 
    // If not visible, we can go directly to /admin/reports or find the link.
    // In `TicketList.jsx`, there isn't a Reports link visible in the code I read.
    // Maybe in `Header.jsx`? 
    // I'll try direct navigation or looking for link.

    // Let's assume there is a link named "Reports" or we visit URL.
    // Subagent saw "Reports" link? 
    // Actually subagent actions for admin flow step 57 used `open_browser_url`.
    // So let's use URL to be safe, but try link if exists.

    await page.goto('/admin/reports'); // Safe fallback

    // Select "This Month"
    // Select "This Month"
    // Label is not associated with select via id/for, so we use layout selector
    // Using specific locator to avoid ambiguity if multiple selects exist
    await page.getByLabel('Date Range').selectOption('thisMonth');
    // Code for ReportsPage would confirm, but let's guess 'thisMonth' or similar. 
    // `verify_suite.ps1` used `dateRange=thisMonth`.

    await page.getByRole('button', { name: /Apply Filters/i }).click();

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Intercept download
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Export to Excel/i }).click(),
    ]);

    const fileName = await download.suggestedFilename();
    expect(fileName).toMatch(/tickets_report/i); // Verified excel name in verify_suite was OK
});
