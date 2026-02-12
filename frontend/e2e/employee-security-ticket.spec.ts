
import { test, expect } from '@playwright/test';

test('Employee can create Security ticket and sees no priority field', async ({ page }) => {
    // 1. Login as Employee (Bypass via localStorage)
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
        localStorage.setItem('userRole', 'EMPLOYEE');
        localStorage.setItem('username', 'employee_john');
        localStorage.setItem('userId', '3'); // ID from users.json
    });
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveURL('http://localhost:5173/');

    // 2. Go to Create Ticket
    // 2. Go to Create Ticket
    await page.click('a[href="/create"]');
    await expect(page).toHaveURL('http://localhost:5173/create');

    // 3. Fill details
    await page.fill('input[name="title"]', 'Suspicious Email Security Test');
    await page.fill('textarea[name="description"]', 'Received a phishing attempt from unknown sender.');

    // 4. Select Category Security
    await page.selectOption('select[name="category"]', 'SECURITY');

    // 5. Verify Priority Field is NOT present
    const prioritySelect = page.locator('select[name="priority"]');
    await expect(prioritySelect).not.toBeVisible();
    await expect(page.locator('text=Priority')).not.toBeVisible();

    // 6. Select Manager (Required now)
    // We need to ensure 'manager.one' is in the mocked data or DB
    // For now, select by value or index if possible, or just the first available
    // But strictly, let's try selecting 'manager.one'
    const managerSelect = page.locator('select[name="managerSelect"]');
    await expect(managerSelect).toBeVisible();

    // Fetch Managers first
    await page.click('button:has-text("Fetch Managers")');
    // Wait for options to populate (checking if loading text is gone or option is present)
    await expect(managerSelect).not.toContainText("Please click");
    // Select the second option (first is "Select Manager...")
    await managerSelect.selectOption({ index: 1 });

    // 7. Submit
    // Listen for alert? No, we expect redirect with state.
    await page.click('button[type="submit"]');

    // 8. Verify Success (Redirect to Dashboard)
    await expect(page).toHaveURL('http://localhost:5173/');
    // Check for success message if possible (it's in location state, might flash)
    // Check that the new ticket appears in the list
    await expect(page.locator('text=Suspicious Email Security Test')).toBeVisible();
});
