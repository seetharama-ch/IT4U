import { expect, Page } from '@playwright/test';

/**
 * Soft footer check - warns but doesn't fail test
 * Use this in multi-tab/session tests so footer issues don't block core validation
 */
export async function checkFooterSoft(page: Page): Promise<boolean> {
    const footer = page.getByTestId('app-footer');
    const count = await footer.count();

    if (count === 0) {
        console.warn(`[WARN] Footer missing on ${page.url()}`);
        return false;
    }

    console.log(`[Footer] ✅ Footer found on ${page.url()}`);
    return true;
}

/**
 * Strict footer assertion - FAILS test if missing
 * Use this only in dedicated footer validation tests
 */
export async function assertFooterStrict(page: Page): Promise<void> {
    const footer = page.getByTestId('app-footer');

    // Footer must be visible
    await expect(footer).toBeVisible({ timeout: 15000 });

    // Footer must contain required branding
    await expect(footer).toContainText('Crafted by Seetharam', { timeout: 5000 });
    await expect(footer).toContainText('GeoSoftGlobal-Surtech International', { timeout: 5000 });

    console.log('[Footer] ✅ Footer visible and validated');
}

/**
 * Assert that the footer is visible and contains required branding
 * 
 * Footer MUST:
 * - Be visible on ALL pages (login, dashboards, etc.)
 * - Have data-testid="app-footer"
 * - Contain: "Crafted by Seetharam"
 * - Contain: "GeoSoftGlobal-Surtech International"
 * 
 * Usage:
 * ```ts
 * await page.goto('/login');
 * await assertFooterVisible(page);
 * ```
 */
export async function assertFooterVisible(page: Page): Promise<void> {
    const footer = page.getByTestId('app-footer');

    // Footer must be visible
    await expect(footer).toBeVisible({ timeout: 15000 });

    // Footer must contain required branding
    await expect(footer).toContainText('Crafted by Seetharam', { timeout: 5000 });
    await expect(footer).toContainText('GeoSoftGlobal-Surtech International', { timeout: 5000 });

    console.log('[Footer] ✅ Footer visible and validated');
}

/**
 * Assert footer on specific page path
 */
export async function assertFooterOnPage(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
    await assertFooterVisible(page);
    console.log(`[Footer] ✅ Footer verified on ${path}`);
}
