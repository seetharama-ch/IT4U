import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES = path.resolve(__dirname, 'fixtures');

test.describe('Negative Scenarios', () => {

    test('Negative - Invalid attachment type should be rejected', async ({ page }) => {
        // login as employee
        await page.goto('/login');
        await page.getByLabel(/username/i).fill('e2e_emp_01');
        await page.getByLabel(/password/i).fill('Pass@12345');
        await page.getByRole('button', { name: /login|sign in/i }).click();

        await page.getByRole('link', { name: /report issue|create ticket/i }).first().click();

        // Upload invalid exe
        const invalidFile = path.join(FIXTURES, 'invalid_attachment.exe');

        // Handle alert or error message on upload
        // Some UIs block on select, some on submit.
        await page.setInputFiles('input[type="file"]', invalidFile);

        // Expect UI error (adapt message)
        await expect(page.getByText(/invalid file|not supported|only pdf|png|jpg|txt|error/i)).toBeVisible();
    });

    test('Negative - Oversize attachment should be rejected', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel(/username/i).fill('e2e_emp_01');
        await page.getByLabel(/password/i).fill('Pass@12345');
        await page.getByRole('button', { name: /login|sign in/i }).click();

        await page.getByRole('link', { name: /report issue|create ticket/i }).first().click();

        const bigFile = path.join(FIXTURES, 'oversize_file.pdf');
        await page.setInputFiles('input[type="file"]', bigFile);

        await expect(page.getByText(/too large|max.*2mb|error/i)).toBeVisible();
    });

});
