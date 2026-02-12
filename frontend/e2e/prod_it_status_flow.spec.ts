import { test, expect } from '@playwright/test';
import { loginAs, logout } from './utils/login-helpers';

test.describe('PROD - IT Status Flow', () => {

    test('IT Support processes ticket', async ({ page }) => {
        // 1. Login qa_its1
        await page.goto('/login');
        await page.fill('input[name="username"]', 'qa_its1');
        await page.fill('input[name="password"]', 'Test@1234');
        await page.click('button[type="submit"]');

        // 2. Open IT Queue
        await page.goto('/app/it/queue');

        // 3. Find our ticket (OPEN state)
        const row = page.getByRole('row').filter({ hasText: 'QA PROD Test Ticket' }).first();
        if (await row.isVisible()) {
            await row.getByRole('link', { name: /View|Details/i }).click();
        } else {
            await page.getByText('QA PROD Test Ticket').first().click();
        }

        // 4. Change Status: OPEN -> IN_PROGRESS
        const statusSelect = page.locator('select[name="status"]'); // Or however status is changed
        // If it's a dropdown
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('IN_PROGRESS');
            await page.getByRole('button', { name: /Update|Save/i }).click();
        } else {
            // Might be buttons
            await page.getByRole('button', { name: /Start Progress|In Progress/i }).click();
        }
        await expect(page.getByText('IN_PROGRESS')).toBeVisible();

        // 5. Change Status: IN_PROGRESS -> RESOLVED
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('RESOLVED');
            await page.getByRole('button', { name: /Update|Save/i }).click();
        } else {
            await page.getByRole('button', { name: /Resolve/i }).click();
        }
        await expect(page.getByText('RESOLVED')).toBeVisible();

        // 6. Change Status: RESOLVED -> CLOSED
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption('CLOSED');
            await page.getByRole('button', { name: /Update|Save/i }).click();
        } else {
            await page.getByRole('button', { name: /Close/i }).click();
        }
        await expect(page.getByText('CLOSED')).toBeVisible();

        await logout(page);
    });
});
