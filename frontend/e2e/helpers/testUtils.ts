/**
 * Production E2E Test Utilities
 * Enhanced helper functions for production testing
 */

import { Page } from '@playwright/test';

/**
 * Generate unique test identifier with timestamp
 * Format: E2E_YYYYMMDD_HHMM_<suffix>
 */
export function generateTestId(suffix: string = ''): string {
    const now = new Date();
    const date = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    return suffix ? `E2E_${date}_${time}_${suffix}` : `E2E_${date}_${time}`;
}

/**
 * Load production credentials from environment
 */
export function loadProdCredentials() {
    return {
        admin: {
            username: process.env.PROD_ADMIN_USER || 'admin',
            password: process.env.PROD_ADMIN_PASS || 'Admin@123'
        },
        support: {
            username: process.env.PROD_SUPPORT_USER || 'E2E_SUPPORT',
            password: process.env.PROD_SUPPORT_PASS || 'Password@123'
        },
        manager: {
            username: process.env.PROD_MANAGER_USER || 'E2E_MANAGER',
            password: process.env.PROD_MANAGER_PASS || 'Password@123'
        },
        employee1: {
            username: process.env.PROD_EMPLOYEE1_USER || 'E2E_EMPLOYEE1',
            password: process.env.PROD_EMPLOYEE1_PASS || 'Password@123'
        },
        employee2: {
            username: process.env.PROD_EMPLOYEE2_USER || 'E2E_EMPLOYEE2',
            password: process.env.PROD_EMPLOYEE2_PASS || 'Password@123'
        }
    };
}

/**
 * Check for console errors on page
 */
export async function expectNoConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // Filter out expected errors
            if (!text.includes('401') && !text.includes('Unauthorized')) {
                errors.push(text);
            }
        }
    });

    return errors;
}

/**
 * Check for failed network requests
 */
export async function expectNoFailedRequests(page: Page, excludeStatuses: number[] = [401]): Promise<any[]> {
    const failures: any[] = [];

    page.on('response', (response) => {
        const status = response.status();
        const url = response.url();

        // Track 4xx/5xx except excluded statuses
        if (status >= 400 && !excludeStatuses.includes(status)) {
            failures.push({
                url,
                status,
                statusText: response.statusText()
            });
        }
    });

    return failures;
}

/**
 * Wait for no network activity (enhanced networkidle)
 */
export async function waitForStability(page: Page, timeout: number = 3000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500); // Additional buffer
}

/**
 * Verify no "Failed to load" messages on page
 */
export async function expectNoFailToLoad(page: Page): Promise<void> {
    const failMessages = await page.locator('text=/failed to load|error loading|could not load/i').count();
    if (failMessages > 0) {
        throw new Error('Page contains "Failed to load" error messages');
    }
}

/**
 * Get base URL for production
 */
export function getBaseURL(): string {
    return process.env.E2E_BASE_URL || 'https://gsg-mecm.gsg.in';
}

/**
 * Get API base URL
 */
export function getAPIBaseURL(): string {
    return `${getBaseURL()}/api`;
}
