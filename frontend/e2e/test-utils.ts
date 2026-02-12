import { Page } from '@playwright/test';

/**
 * Pauses the test execution for a specified duration if PWDEBUG env var is set.
 * This allows for visual inspection during debug runs.
 * @param page The Playwright page object
 * @param ms Duration in milliseconds (default 2000)
 */
export async function visualPause(page: Page, ms: number = 2000): Promise<void> {
    if (process.env.IT4U_DEBUG) {
        console.log(`[Visual Pause] Waiting ${ms}ms...`);
        await page.waitForTimeout(ms);
    }
}
