/**
 * Production Employee Dashboard Tests
 * Tests for Employee role - ticket creation in all categories with attachments
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { loadProdCredentials, generateTestId, expectNoFailToLoad, waitForStability } from './helpers/testUtils';
import * as path from 'path';

test.describe('Production Employee Dashboard', () => {
    let creds: ReturnType<typeof loadProdCredentials>;

    test.beforeAll(() => {
        creds = loadProdCredentials();
    });

    test('Employee dashboard loads without errors', async ({ page }) => {
        await login(page, creds.employee1);

        // Should redirect to employee dashboard
        await expect(page).toHaveURL(/\/app\/employee/);

        // Dashboard should be visible
        await expect(page.locator('header')).toBeVisible();
        await waitForStability(page);

        await expectNoFailToLoad(page);
    });

    test('My Tickets view loads', async ({ page }) => {
        await login(page, creds.employee1);
        await waitForStability(page);

        // Should see tickets table or empty state
        const ticketsTable = page.locator('table').or(page.getByTestId('tickets-table')).or(page.locator('text=/no tickets|your tickets/i')).first();
        await expect(ticketsTable).toBeVisible();
    });

    test('Create ticket in HARDWARE category', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('HARDWARE_Ticket');
        await createTicket(page, {
            title: ticketTitle,
            category: 'HARDWARE',
            description: 'E2E Test - Hardware issue for production testing'
        });

        // Verify ticket appears in My Tickets
        await page.goto('/app/employee', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);
        await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
    });

    test('Create ticket in SOFTWARE category', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('SOFTWARE_Ticket');
        await createTicket(page, {
            title: ticketTitle,
            category: 'SOFTWARE',
            description: 'E2E Test - Software issue for production testing'
        });

        await page.goto('/app/employee', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);
        await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
    });

    test('Create ticket in NETWORK category', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('NETWORK_Ticket');
        await createTicket(page, {
            title: ticketTitle,
            category: 'NETWORK',
            description: 'E2E Test - Network issue for production testing'
        });

        await page.goto('/app/employee', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);
        await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
    });

    test('Create ticket with attachment', async ({ page }) => {
        await login(page, creds.employee1);

        const ticketTitle = generateTestId('ATTACHMENT_Ticket');
        const attachmentPath = path.resolve(__dirname, 'fixtures', 'sample.txt');

        await createTicket(page, {
            title: ticketTitle,
            category: 'OTHERS',
            description: 'E2E Test - Ticket with attachment',
            attachmentPath
        });

        await page.goto('/app/employee', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);
        await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
    });

    test('Verify POST /api/tickets returns 201', async ({ page }) => {
        await login(page, creds.employee1);

        let createRequestCaptured = false;
        let createStatus = 0;

        page.on('response', (response) => {
            if (response.url().includes('/api/tickets') && response.request().method() === 'POST') {
                createRequestCaptured = true;
                createStatus = response.status();
            }
        });

        const ticketTitle = generateTestId('API_Test_Ticket');
        await createTicket(page, {
            title: ticketTitle,
            category: 'OTHERS',
            description: 'E2E Test - API validation'
        });

        expect(createRequestCaptured).toBe(true);
        expect(createStatus).toBe(201);
    });

    test('Success toast appears after ticket creation', async ({ page }) => {
        await login(page, creds.employee1);

        await page.goto('/app/tickets/new', { waitUntil: 'domcontentloaded' });
        await waitForStability(page);

        const ticketTitle = generateTestId('TOAST_Test');

        await page.locator('[data-testid="ticket-title"]').or(page.getByLabel(/title/i).first()).fill(ticketTitle);
        await page.locator('[data-testid="ticket-category"]').or(page.getByLabel(/category/i).first()).selectOption('OTHERS');
        await page.locator('[data-testid="ticket-description"]').or(page.getByLabel(/description/i).first()).fill('Test description');

        await page.locator('[data-testid="ticket-submit"]').or(page.getByRole('button', { name: /submit|create/i }).first()).click();

        // Success modal or toast should appear
        await expect(
            page.locator('[data-testid="ticket-success-modal"]').or(page.locator('text=/success|created|submitted/i').first())
        ).toBeVisible({ timeout: 15000 });
    });

    test.afterEach(async ({ page }) => {
        await logout(page).catch(() => { });
    });
});

/**
 * Helper function to create a ticket
 */
async function createTicket(page: any, options: {
    title: string;
    category: string;
    description: string;
    attachmentPath?: string;
}) {
    await page.goto('/app/tickets/new', { waitUntil: 'domcontentloaded' });
    await waitForStability(page);

    // Fill title
    const titleField = page.locator('[data-testid="ticket-title"]').or(page.getByLabel(/title/i).first());
    await titleField.fill(options.title);

    // Select category
    const categoryField = page.locator('[data-testid="ticket-category"]').or(page.getByLabel(/category/i).first());
    await categoryField.selectOption(options.category);

    // Fill description
    const descField = page.locator('[data-testid="ticket-description"]').or(page.getByLabel(/description/i).first());
    await descField.fill(options.description);

    // Manager select (if required for category)
    const managerSelect = page.locator('[data-testid="ticket-manager"]').or(page.getByLabel(/manager/i).first());
    if (await managerSelect.isVisible()) {
        const optionCount = await managerSelect.locator('option').count();
        if (optionCount > 1) {
            await managerSelect.selectOption({ index: 1 });
        }
    }

    // Upload attachment if provided
    if (options.attachmentPath) {
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible()) {
            await fileInput.setInputFiles(options.attachmentPath);
            await page.waitForTimeout(1000);
        }
    }

    // Submit
    const submitBtn = page.locator('[data-testid="ticket-submit"]').or(page.getByRole('button', { name: /submit|create/i }).first());
    await submitBtn.click();

    // Wait for success modal
    await page.locator('[data-testid="ticket-success-modal"]').or(page.locator('text=/success|created/i').first()).waitFor({ state: 'visible', timeout: 15000 });

    // Close modal
    const okBtn = page.locator('[data-testid="ticket-success-ok"]').or(page.getByRole('button', { name: /ok|close/i }).first());
    if (await okBtn.isVisible()) {
        await okBtn.click();
    }

    await waitForStability(page);
}
