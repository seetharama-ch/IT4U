import { Page, expect } from '@playwright/test';

export async function login(page: Page, username: string, password: string) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Adjust selectors based on your UI fields
    // Trying common selectors for username/email
    const userField = page.getByLabel(/username|email/i).or(page.locator('input[name="username"]')).or(page.locator('input[type="text"]'));
    await userField.first().fill(username);

    const passField = page.getByLabel(/password/i).or(page.locator('input[name="password"]')).or(page.locator('input[type="password"]'));
    await passField.first().fill(password);

    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Dashboard header/nav should appear
    // Dashboard header/nav should appear
    // "My Tickets" is the main header for employees. "Dashboard" is in nav.
    // Dashboard header/nav should appear
    // "My Tickets" is the main header for employees.
    // Using getByRole heading is more specific than getByText
    await expect(page.getByRole('heading', { name: /my tickets/i }).or(page.getByRole('link', { name: /dashboard/i })).first()).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page) {
    // Adjust selector
    // Finding profile menu. Often it has the username or 'Profile' or an avatar.
    const menu = page.getByRole('button', { name: /profile|account|admin|manager|employee|support/i }).first();
    // Sometimes specific usernames appear, so we might need a more generic locator if button names vary dynamically
    // Fallback to a common profile icon or menu selector if specific names fail? 
    // For now trust the user's instruction but make it robust
    await menu.click({ force: true });

    const logoutItem = page.getByRole('menuitem', { name: /logout/i }).or(page.getByText(/logout/i));
    await logoutItem.click();
    await page.waitForURL(/\/login/i);
}
// Helper functions for specific roles
export async function loginAsEmployee(page: Page) {
    await login(page, 'employee_e2e_20251225', 'Password123!');
}

export async function loginAsManager(page: Page) {
    await login(page, 'manager_e2e_20251225', 'Password123!');
}

export async function loginAsAdmin(page: Page) {
    await login(page, 'admin_e2e_20251225', 'Password123!');
}
