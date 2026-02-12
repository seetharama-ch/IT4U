/**
 * Production Smoke Tests & Health Checks
 * Phase 1: Environment & Smoke Verification
 */

import { test, expect } from '@playwright/test';
import { getBaseURL, getAPIBaseURL } from './helpers/testUtils';

test.describe('Production Smoke Tests', () => {

    test('Health endpoint returns UP status', async ({ request }) => {
        const response = await request.get(`${getBaseURL()}/actuator/health`, {
            ignoreHTTPSErrors: true
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.status).toBe('UP');
    });

    test('Auth endpoint returns 401 for unauthenticated requests (not 405)', async ({ request }) => {
        const response = await request.get(`${getAPIBaseURL()}/auth/me`, {
            ignoreHTTPSErrors: true
        });

        // Should return 401 Unauthorized, NOT 405 Method Not Allowed
        expect(response.status()).toBe(401);
        expect(response.status()).not.toBe(405);
    });

    test('Root path returns HTML (200)', async ({ page }) => {
        const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

        expect(response?.status()).toBe(200);
        expect(response?.headers()['content-type']).toContain('text/html');
    });

    test('Login path returns HTML (200)', async ({ page }) => {
        const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });

        expect(response?.status()).toBe(200);
        expect(response?.headers()['content-type']).toContain('text/html');
    });

    test('App path returns HTML (200) - SPA routing works', async ({ page }) => {
        const response = await page.goto('/app', { waitUntil: 'domcontentloaded' });

        expect(response?.status()).toBe(200);
        expect(response?.headers()['content-type']).toContain('text/html');
    });

    test('App tickets path returns HTML (200) - Deep link routing works', async ({ page }) => {
        const response = await page.goto('/app/tickets', { waitUntil: 'domcontentloaded' });

        expect(response?.status()).toBe(200);
        expect(response?.headers()['content-type']).toContain('text/html');
    });

    test('No console errors on login page load', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Ignore expected 401s
                if (!text.includes('401') && !text.includes('Unauthorized')) {
                    consoleErrors.push(text);
                }
            }
        });

        await page.goto('/login', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000); // Allow time for any errors to surface

        expect(consoleErrors).toEqual([]);
    });

    test('No failed network calls on login page (except 401)', async ({ page }) => {
        const networkFailures: any[] = [];

        page.on('response', (response) => {
            const status = response.status();
            // Track 4xx/5xx except 401
            if (status >= 400 && status !== 401) {
                networkFailures.push({
                    url: response.url(),
                    status,
                    statusText: response.statusText()
                });
            }
        });

        await page.goto('/login', { waitUntil: 'networkidle' });

        expect(networkFailures).toEqual([]);
    });
});
