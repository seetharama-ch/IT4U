
import { test, expect } from "@playwright/test";

test("ISSUE-8: Reproduce 500 on Status Change", async ({ page }) => {
    // Helper to capture 500s
    page.on('response', async response => {
        if (response.status() === 500) {
            console.log(`[500 ERROR] ${response.url()}`);
            console.log(`Payload: ${response.request().postData()}`);
            try {
                console.log(`Response Body: ${await response.text()}`);
            } catch (e) {
                console.log("Could not read response body");
            }
        }
    });

    // Helper to create ticket
    const createTicket = async (user, pass) => {
        await page.goto("/login");
        await page.fill('input[name="username"]', user);
        await page.fill('input[name="password"]', pass);
        await page.click("button:has-text('Login')");
        // Wait for nav
        await page.waitForTimeout(2000);
        await page.goto("/app/tickets/new");
        await page.fill('input[name="title"]', `Repro Ticket ${Date.now()}`);
        await page.fill('textarea[name="description"]', "Reproduction ticket for 500 error");
        await page.selectOption('select[name="priority"]', "MEDIUM");
        await page.selectOption('select[name="category"]', "Other");
        await page.click('button:has-text("Submit")');
        // Wait for redirect to details or list
        await page.waitForTimeout(2000);
        // Assuming it redirects to details or list. 
        // If list, we click first. If details, we are there.
        if (!page.url().includes("/tickets/")) {
            // Go to list and click first
            await page.goto("/app/tickets");
            await page.locator("tr").first().click();
        }
    };

    // 1. Admin Login and Status Change
    await test.step("Admin changes status to IN_PROGRESS", async () => {
        await createTicket("admin", "admin123");

        // Now we are presumably on ticket details page
        // Find ticket ID from URL for logging
        const url = page.url();
        console.log(`Testing with ticket: ${url}`);

        // Change Status
        const statusSelect = page.locator('select[data-testid="admin-ticket-status-select"]');
        if (await statusSelect.isVisible()) {
            await statusSelect.selectOption("IN_PROGRESS");
            await page.click("button:has-text('Submit')"); // "Submit" button in screenshot

            // Wait for potential failure
            await page.waitForTimeout(2000);
        } else {
            console.log("Admin Actions / Status dropdown not found");
        }

        // Check for error toast
        const errorToast = page.locator("text=Internal Server Error");
        if (await errorToast.isVisible()) {
            console.log("Reproduced 500 as Admin!");
        }
    });

    // Logout
    await page.goto("/login"); // clear state/logout effectively or use logout button

    // 2. IT Support Login and Status Change
    await test.step("IT Support changes status to CLOSED", async () => {
        // Need to ensure there is a ticket for support. Can admin create and assign?
        // Or support create their own? Let's have support create their own for simplicity.
        // Or if support can't create, we need admin to create and assign.
        // Assuming support can create.

        await createTicket("sup_phase2b", "password");

        // Change Status
        const statusSelect = page.locator('select[data-testid="admin-ticket-status-select"]');
        if (await statusSelect.isVisible()) {
            // Try to close
            await statusSelect.selectOption("CLOSED");
            // Might need comment if required?
            // Fill comment if exists
            const commentBox = page.locator('textarea[name="resolution"]');
            if (await commentBox.isVisible()) {
                await commentBox.fill("Closing ticket");
            }

            await page.click("button:has-text('Submit')");

            await page.waitForTimeout(2000);
        }

        // Check for error toast
        const errorToast = page.locator("text=Internal Server Error");
        if (await errorToast.isVisible()) {
            console.log("Reproduced 500 as Support!");
        }
    });
});
