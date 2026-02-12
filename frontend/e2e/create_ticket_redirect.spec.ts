import { test, expect } from "@playwright/test";

test("Employee creates ticket -> shows success popup -> OK -> redirects to My Tickets", async ({ page }) => {
    // 1. Login
    await page.goto("/login");
    await page.getByLabel("Username").fill("employee_john");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /login/i }).click();

    // Must land on employee page
    await expect(page).toHaveURL(/\/app\/employee/);

    // 2. Navigate to Create Ticket
    await page.getByRole("link", { name: /\+ New Ticket/i }).click();

    // 3. Fill Form
    await page.getByPlaceholder("Brief summary").fill("E2E - Redirect bug test");
    await page.locator('select[name="category"]').selectOption({ label: "Network Issues" });
    await page.locator('textarea[name="description"]').fill("Creating ticket should show popup and redirect to My Tickets.");

    // Manager selection
    // Assuming test_manager exists and is loadable
    await page.getByRole('button', { name: /fetch managers/i }).click();
    await page.waitForResponse(resp => resp.url().includes('/managers') && resp.status() === 200);

    // Select a manager if dropdown is populated, otherwise typing might be needed if it was a combobox, 
    // but code shows <select> so we wait for options
    const managerSelect = page.locator('select[name="managerSelect"]');
    await expect(managerSelect).not.toBeDisabled();

    // Select by value if we knew a specific manager, or just select index 1 (skipping "Select Manager...")
    await managerSelect.selectOption({ index: 1 });

    // 4. Submit
    await page.getByRole("button", { name: /submit|create/i }).click();

    // 5. Verify Popup
    // The popup should appear. 
    // Note: The locators here depend on the implementation of the new Modal.
    const dialog = page.locator('.fixed.inset-0').first(); // Crude selector for modal overlay
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();

    // 6. Click OK -> must go to My Tickets (employee dashboard)
    await page.getByRole("button", { name: /^ok$/i }).click();

    // 7. Verify Redirect
    await expect(page).toHaveURL(/\/app\/employee/);
    await expect(page.getByRole('heading', { name: "My Tickets" })).toBeVisible();
});
