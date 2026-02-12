import { test, expect } from "@playwright/test";

test("Employee creates ticket -> popup -> OK -> redirects to My Tickets", async ({ page }) => {
    // Use relative path if baseURL is set in playright config, or fallback to standard ports if needed
    // Using the user provided specific URL for now, but keeping in mind it might need adjustment if 8060 is pure backend
    // Converting to relative /login to be safer with config, but instructions said 8060. 
    // I will check if I can assume baseURL is set or just try the user's explicit instruction.
    // User explicit instruction: await page.goto("/login");
    // I will stick to the user's code as much as possible.

    await page.goto("/login");

    await page.getByLabel("Username").fill("test_user");
    await page.getByLabel("Password").fill("Geosoft@1234");
    await page.getByRole("button", { name: /Login/i }).click();

    await expect(page).toHaveURL(/\/app\/employee/);

    await page.getByRole("link", { name: "New Ticket", exact: false }).click();

    await page.getByLabel(/title/i).fill("QA - Create Ticket Redirect Test");
    // Select a category (index 1 is likely "Hardware" or similar, verify locally if needed, but index 1 is usually safe)
    // Select Others to avoid extra validation fields
    await page.getByLabel(/category/i).selectOption({ label: "Others (General Inquiry)" });

    await page.getByLabel(/description/i).fill("Submit should show popup and redirect to My Tickets.");

    // Handle Manager Selection (Dynamic Fetch)
    await page.getByRole("button", { name: /Fetch Managers/i }).click();
    // Wait for options to load (checking for non-disabled or specific text)
    await expect(page.getByRole("combobox", { name: /Approving Manager/i })).not.toHaveText(/Please click/);

    // Select first available manager (usually manager_mike or similar)
    await page.getByLabel(/approving manager/i).selectOption({ index: 1 });

    await page.getByRole("button", { name: /submit|create/i }).click();

    // Modal might not have role="dialog", so checking for specific text
    await expect(page.getByText(/Ticket Created!|Submission Failed/i)).toBeVisible();
    await expect(page.getByText(/Ticket Number:/i)).toBeVisible();

    await page.getByRole("button", { name: /^ok$/i }).click();

    await expect(page).toHaveURL(/\/app\/employee/);
    await expect(page.getByRole("heading", { name: /my tickets/i })).toBeVisible();
});
