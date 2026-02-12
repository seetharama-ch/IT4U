import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the saved storage state for this test file
test.use({ storageState: path.join(__dirname, '../../auth-setup/storageState.json') });

test('SSO session can create ticket and see success', async ({ page }) => {
    // 1. Go to home page and verify login
    await page.goto('http://localhost:8081/');
    await expect(page).toHaveTitle(/IT4U|GSG/i);

    // 2. Navigate to Create Ticket
    // Assuming there is a button or link to create ticket
    await page.getByRole('button', { name: /Create Ticket/i }).click();

    // 3. Fill Ticket Form
    // Using generic selectors, adjust based on actual component attributes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.getByLabel(/Title/i).fill(`AUTO-SSO-TEST-${timestamp}`);

    // Select Category
    // Adjust if using a custom dropdown
    await page.getByRole('combobox', { name: /Category/i }).click();
    await page.getByText(/General/i).click();

    // Select Priority
    await page.getByRole('combobox', { name: /Priority/i }).click();
    await page.getByText(/Medium/i).click();

    await page.getByLabel(/Description/i).fill('Automated E2E test for SSO ticket creation.');

    // 4. Submit
    await page.getByRole('button', { name: /Submit|Create/i }).click();

    // 5. Verify Success Message or Redirection
    await expect(page.getByText(/Ticket Created Successfully/i)).toBeVisible();

    // Optional: Verify Ticket ID is visible
    // await expect(page.locator('.ticket-id')).toBeVisible();
});
