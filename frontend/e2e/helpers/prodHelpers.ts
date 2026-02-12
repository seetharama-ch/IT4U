/**
 * Production E2E Test Helpers
 * 
 * Provides utilities for running tests against production URL (https://gsg-mecm)
 * without hardcoded localhost references.
 */

import { Page, APIRequestContext } from '@playwright/test';

/**
 * Get the base URL for the application
 * Uses baseURL from Playwright config (https://gsg-mecm)
 */
export function getBaseURL(): string {
    return process.env.E2E_BASE_URL || 'https://gsg-mecm';
}

/**
 * Get the API base URL
 * For production, API is served from same domain
 */
export function getAPIBaseURL(): string {
    const base = getBaseURL();
    return `${base}/api`;
}

/**
 * Navigate to a path using baseURL
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
    const url = path.startsWith('/') ? path : `/${path}`;
    await page.goto(url);
}

/**
 * Production-safe API request helper
 * Uses the configured baseURL instead of hardcoded localhost
 */
export class ProdAPIClient {
    constructor(private request: APIRequestContext) { }

    /**
     * POST request to API endpoint
     */
    async post(endpoint: string, options?: any) {
        const url = `${getAPIBaseURL()}${endpoint}`;
        return await this.request.post(url, options);
    }

    /**
     * GET request to API endpoint
     */
    async get(endpoint: string, options?: any) {
        const url = `${getAPIBaseURL()}${endpoint}`;
        return await this.request.get(url, options);
    }

    /**
     * PUT request to API endpoint
     */
    async put(endpoint: string, options?: any) {
        const url = `${getAPIBaseURL()}${endpoint}`;
        return await this.request.put(url, options);
    }

    /**
     * DELETE request to API endpoint
     */
    async delete(endpoint: string, options?: any) {
        const url = `${getAPIBaseURL()}${endpoint}`;
        return await this.request.delete(url, options);
    }
}

/**
 * Create a production API client from Page or APIRequestContext
 */
export function createProdAPIClient(pageOrRequest: Page | APIRequestContext): ProdAPIClient {
    if ('request' in pageOrRequest) {
        return new ProdAPIClient(pageOrRequest.request);
    }
    return new ProdAPIClient(pageOrRequest);
}

/**
 * Production data reset helper
 * Resets and seeds the database for clean test runs
 */
export async function resetProductionData(request: APIRequestContext): Promise<void> {
    const api = new ProdAPIClient(request);

    console.log('[PROD] Logging in as admin...');
    const loginResp = await api.post('/auth/login', {
        data: {
            username: 'admin',
            password: 'Admin@123'
        }
    });

    if (!loginResp.ok()) {
        throw new Error(`Admin login failed: ${loginResp.status()}`);
    }

    console.log('[PROD] Resetting database...');
    const resetResp = await api.post('/admin/system/reset');
    if (!resetResp.ok() && resetResp.status() !== 404) {
        console.warn(`Reset endpoint returned ${resetResp.status()}, continuing...`);
    }

    console.log('[PROD] Seeding test data...');
    const seedResp = await api.post('/admin/system/seed-default');
    if (!seedResp.ok() && seedResp.status() !== 404) {
        console.warn(`Seed endpoint returned ${seedResp.status()}, continuing...`);
    }

    console.log('[PROD] Production data reset complete');
}

/**
 * Login helper for production tests
 */
export async function loginAsProd(
    page: Page,
    username: string,
    password: string
): Promise<void> {
    await navigateTo(page, '/login');
    await page.fill('[data-testid="username-input"]', username);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-submit"]');

    // Wait for redirect away from login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
}

/**
 * Production test credentials
 */
export const PROD_CREDENTIALS = {
    admin: {
        username: 'admin',
        password: 'Admin@123'
    },
    employee1: {
        username: 'emp1',
        password: 'Emp@123'
    },
    employee2: {
        username: 'emp2',
        password: 'Emp@123'
    },
    manager1: {
        username: 'mgr1',
        password: 'Mgr@123'
    },
    manager2: {
        username: 'mgr2',
        password: 'Mgr@123'
    },
    support1: {
        username: 'sup1',
        password: 'Sup@123'
    }
};
