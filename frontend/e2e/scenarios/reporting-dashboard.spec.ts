import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/utils';

test('Admin Reporting Dashboard: filters + Excel/CSV export', async ({ page }) => {
    // 1. Login as Admin
    await loginAs(page, 'admin', 'password');

    // 2. Navigate to Admin Dashboard (Ticket List is the default dashboard)
    // Ensure we are on the dashboard
    await expect(page.getByText(/Admin Dashboard/i)).toBeVisible();

    // 3. Click on "Reporting Dashboard" tab
    await page.getByRole('button', { name: /Reporting Dashboard/i }).click();

    // 4. Apply basic filters: "This Month"
    // Using getByLabel now that we added htmlFor/id
    await page.getByLabel('Date Range').selectOption('thisMonth');

    await page.getByRole('button', { name: /Apply Filters/i }).click();

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Confirm either some data or "No tickets found" text, but header should be visible
    await expect(page.getByRole('columnheader', { name: /Ticket #/i })).toBeVisible();

    // 5. Export to Excel
    const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Export to Excel/i }).click(),
    ]);
    const excelName = await excelDownload.suggestedFilename();
    expect(excelName.toLowerCase()).toContain('tickets_report');
    expect(excelName.toLowerCase()).toContain('.xlsx');

    // 6. Export to CSV
    const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /Export to CSV/i }).click(),
    ]);
    const csvName = await csvDownload.suggestedFilename();
    expect(csvName.toLowerCase()).toContain('tickets_report');
    expect(csvName.toLowerCase()).toContain('.csv');
});
