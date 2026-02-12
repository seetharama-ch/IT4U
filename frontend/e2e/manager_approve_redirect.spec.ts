import { test, expect } from "@playwright/test";

test("Manager approves -> popup -> OK -> manager dashboard", async ({ page }) => {
    // CAPTURE CONSOLE LOGS
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // 1. Submit a ticket as Employee
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Username").fill("employee_john");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for login
    await expect(page).toHaveURL(/.*\/app\/employee/);

    // Create Ticket
    await page.getByRole("link", { name: /\+ New Ticket|Report an Issue/i }).click();
    await page.getByLabel("Title").fill("Test Manager Approval Flow");
    await page.getByLabel("Description").fill("This is a test ticket for approval popup.");

    // Select Category Hardware (requires approval)
    await page.getByLabel("Category").selectOption("HARDWARE");

    // Fill in required Device Details for HARDWARE category
    await page.getByLabel("Device Asset ID / Serial").fill("TEST-DEVICE-001");

    // Select Manager if dropdown exists, or type name
    // Assuming dropdown or auto-selected. If manual input:
    // await page.getByLabel("Manager Name").fill("test_manager");
    // But usually it's a dropdown or pre-filled.
    // Let's assume test_employee has test_manager assigned, or we select one.
    // The system usually requires picking a manager if not auto-assigned.
    // Based on CreateTicket.jsx check (not shown in full), let's assume we need to pick "test_manager"
    // Click Fetch Managers
    await page.getByRole("button", { name: /fetch managers/i }).click();
    // Wait for managers to load (option "Select Manager..." should remain, but disable option "Please click..." should go away or new options appear)
    // We can wait for the request to finish or wait for the specific option
    await expect(page.locator("#managerSelect")).toContainText("manager mike");

    const managerSelect = page.getByLabel("Approving Manager");
    await managerSelect.selectOption({ label: "manager mike (Engineering)" });

    await page.getByRole("button", { name: /Submit Request/i }).click();

    // Expect success popup (toast or modal) from ticket creation
    await expect(page.getByText(/Ticket Created!/i)).toBeVisible();

    // Click OK on the success modal
    await page.getByRole("button", { name: /^ok$/i }).click();

    // Logout
    await page.getByRole("button", { name: /Open user menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    // 2. Login as Manager
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Username").fill("manager_mike");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: /login/i }).click();

    await expect(page).toHaveURL(/.*\/app\/manager/);

    // 3. Find the ticket in Pending
    // Filter by Pending Approvals (default tab)
    await page.getByRole("button", { name: /pending approvals/i }).click();
    await page.waitForTimeout(1000); // Wait for list

    // Click View on the latest ticket (top one or find by title)
    // Assuming first View button corresponds to latest if sorted, or filter by text
    const ticketRow = page.getByRole("row").filter({ hasText: "Test Manager Approval Flow" }).first();
    await ticketRow.getByRole("link", { name: /view/i }).click();

    // 4. Details Page -> Approve
    // Select Decision
    await page.locator("input[name='approvalDecision'][value='APPROVED']").check();

    // Submit
    await page.getByRole("button", { name: /submit review/i }).click();

    // DEBUG: Check for error toast
    const errorToast = page.getByText(/Failed to submit|Failed to approve/i);
    // Short wait for toast
    try {
        await errorToast.waitFor({ state: "visible", timeout: 2000 });
        if (await errorToast.isVisible()) {
            console.log("Test detected error toast!");
            await expect(errorToast).not.toBeVisible(); // Fail the test with info
        }
    } catch (e) {
        // Ignore timeout if toast not found (good)
    }

    // 5. Verify Popup
    // Should see standard "Ticket Approved" modal
    const modal = page.getByRole("dialog"); // or locate by text
    await expect(page.getByText(/This ticket has been forwarded as approved/i)).toBeVisible();
    await expect(page.getByText(/Ticket No:/i)).toBeVisible();
    await expect(page.getByText(/Time:/i)).toBeVisible();

    // 6. Click OK -> Redirect
    await page.getByRole("button", { name: /^ok$/i }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/app\/manager/);

    // Verify ticket is no longer in Pending (optional, but good)
    // await expect(page.getByText("Test Manager Approval Flow")).not.toBeVisible();
});
