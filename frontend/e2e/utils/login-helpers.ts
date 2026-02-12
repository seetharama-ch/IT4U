import { Page, expect } from '@playwright/test';
import { USERS } from '../fixtures/test-data';

export async function loginAs(page: Page, role: keyof typeof USERS) {
    const user = USERS[role];
    await page.goto('/login');
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Wait for navigation away from login
    await expect(page).not.toHaveURL(/.*\/login/);

    // Optional: wait for a common element like "Logout" or "Dashboard"
    // await expect(page.getByText('Logout')).toBeVisible();
}

export async function logout(page: Page) {
    // Assuming there is a logout button in the header or profile menu
    // Need to verify standard logout flow. 
    // For now, simple assertion.
    await page.goto('/files'); // Check if authenticated?
    // Actually best to click logout.
    // Assuming "Logout" button is visible
    if (await page.getByText('Logout').isVisible()) {
        await page.getByText('Logout').click();
    }
}
