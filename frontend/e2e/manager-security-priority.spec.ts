import { test, expect } from '@playwright/test';

test('Manager must set priority for Security ticket before approving', async ({ page }) => {
    // 0. Create Ticket as Employee first (to ensure it exists)
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
        localStorage.setItem('userRole', 'EMPLOYEE');
        localStorage.setItem('username', 'employee_john');
        localStorage.setItem('userId', '3');
    });
    await page.goto('http://localhost:5173/');

    await page.click('a[href="/create"]');
    await page.fill('input[name="title"]', 'Manager Priority Test Ticket');
    await page.fill('textarea[name="description"]', 'Security issue for testing priority.');
    await page.selectOption('select[name="category"]', 'SECURITY');

    // Fetch Managers
    await page.click('button:has-text("Fetch Managers")');
    await expect(page.locator('select[name="managerSelect"]')).not.toContainText("Please click");

    // Select Manager Mike
    // "manager_mike" might be displayed as "manager_mike (Engineering)" or similar.
    // Let's try to select by value if possible? value={manager.username}
    // The select options have value matched to username.
    await page.selectOption('select[name="managerSelect"]', 'manager_mike');

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Logout (assuming there is a logout button, or just go to login)
    // await page.click('text=Logout'); 
    // For safety, just navigate to login which might auto-logout or allow new login?
    // Usually clean way is clear cookies or click logout.
    // Let's check if there is a logout button in Header?
    // Assuming there is. If not, we can `page.context().clearCookies()`.
    await page.evaluate(() => localStorage.clear()); // Clear token if stored there
    // 1. Login as Manager (Bypass)
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
        localStorage.setItem('userRole', 'MANAGER');
        localStorage.setItem('username', 'manager_mike');
        localStorage.setItem('userId', '1');
    });
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveURL('http://localhost:5173/');

    // 2. Find the Security ticket 
    await page.click('text=Manager Priority Test Ticket');


    // 3. Verify "Set Priority" dropdown and Security Badge
    await expect(page.locator('span:has-text("SECURITY")')).toBeVisible();
    const prioritySelect = page.locator('select').filter({ hasText: 'Select Priority' }).or(page.locator('label:has-text("Set Priority") + select'));
    await expect(prioritySelect).toBeVisible();

    // 4. Verify Warning Message
    await expect(page.locator('text=* Priority must be set to Approve')).toBeVisible();

    // 5. Try to Approve WITHOUT setting priority
    // Mock alert
    let dialogMessage = '';
    page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
    });

    const approveBtn = page.locator('button:has-text("Approve Request")');
    await approveBtn.click();

    // Expect failure (alert) or no status change.
    // Since we rely on backend validation, the UI might show alert "Failed to approve"
    // Wait a bit
    await page.waitForTimeout(1000);

    // 6. Set Priority
    await prioritySelect.selectOption('HIGH');

    // Verify warning gone
    await expect(page.locator('text=* Priority must be set to Approve')).not.toBeVisible();

    // 7. Approve Again
    await approveBtn.click();

    // 8. Verify Success
    await expect(page.locator('text=APPROVED')).toBeVisible();

    // Verify Priority is displayed in details
    await expect(page.locator('span:has-text("Priority:")')).toContainText('HIGH');
});
