import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/utils';

test('Validation: manager is required when creating ticket', async ({ page }) => {
    await loginAs(page, 'employee_john', 'password');

    await page.getByRole('link', { name: /Report Issue/i }).click();

    await page.getByLabel(/^Title$/i).fill('Validation – Missing Manager');
    // Need to select Category SOFTWARE to trigger Manager requirement logic (as verified manually)
    await page.getByLabel(/^Category$/i).selectOption('SOFTWARE');

    await page.getByLabel(/Device Asset ID/i).fill('gsg-pc-99');
    await page.getByLabel(/^Software Name$/i).fill('Validation App');
    await page.getByLabel(/^Version$/i).fill('1.0');
    await page.getByLabel(/^Description$/i).fill('Testing manager validation.');

    // Intentionally DO NOT select manager
    await page.getByRole('button', { name: /Submit Request/i }).click();

    // Verified message: "Manager is required for Software tickets"
    await expect(page.getByText(/Manager is required for Software tickets/i)).toBeVisible();
});
