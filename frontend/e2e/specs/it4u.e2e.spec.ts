import { test, expect } from "@playwright/test";
import { users } from "../data/users";
import { login } from "../helpers/auth";
import { createTicketWithAttachment, openTicketDetails } from "../helpers/tickets";

test.describe("IT4U E2E - Ticket Flow + Attachments + Admin Delete", () => {
    const ticketTitle = `E2E Ticket ${Date.now()}`;

    test("Employee creates ticket with attachment (Issue 11 validation)", async ({ page }) => {
        await login(page, users.employee.username, users.employee.password);
        await createTicketWithAttachment(page, ticketTitle);
        await openTicketDetails(page, ticketTitle);

        // ✅ Attachment should be visible in ticket details
        // Adjust text/locator to match your UI labels
        await expect(page.getByText(/attachment/i)).toBeVisible();

        // If you have attachment list:
        await expect(page.getByText("sample-attachment.txt")).toBeVisible();

        await page.screenshot({ path: `./screenshots/employee-ticket-details.png`, fullPage: true });
    });

    test("Manager can view attachment + approve (Issue 11 validation)", async ({ page }) => {
        await login(page, users.manager.username, users.manager.password);

        await page.goto("/manager/tickets", { waitUntil: "networkidle" });
        await page.getByText(ticketTitle).click();

        // ✅ Attachment visible to manager
        await expect(page.getByText("sample-attachment.txt")).toBeVisible();

        // Approve (update button names to match your UI)
        await Promise.all([
            page.waitForResponse((r) => r.url().includes("/tickets") && r.status() < 400),
            page.getByRole("button", { name: /approve/i }).click(),
        ]);

        await expect(page.getByText(/approved|in progress|assigned/i)).toBeVisible();
        await page.screenshot({ path: `./screenshots/manager-approved.png`, fullPage: true });
    });

    test("IT Support can view attachment + move ticket status", async ({ page }) => {
        await login(page, users.itSupport.username, users.itSupport.password);

        await page.goto("/it-support/tickets", { waitUntil: "networkidle" });
        await page.getByText(ticketTitle).click();

        // ✅ Attachment visible to IT Support too
        await expect(page.getByText("sample-attachment.txt")).toBeVisible();

        // Move to In Progress / Resolve (adjust as per workflow)
        const inProgressBtn = page.getByRole("button", { name: /in progress|start/i });
        if (await inProgressBtn.isVisible()) {
            await Promise.all([
                page.waitForResponse((r) => r.url().includes("/tickets") && r.status() < 400),
                inProgressBtn.click(),
            ]);
        }

        const closeBtn = page.getByRole("button", { name: /close|resolve/i });
        if (await closeBtn.isVisible()) {
            await Promise.all([
                page.waitForResponse((r) => r.url().includes("/tickets") && r.status() < 400),
                closeBtn.click(),
            ]);
        }

        await page.screenshot({ path: `./screenshots/it-support-final.png`, fullPage: true });
    });

    test("Admin deletes ticket WITHOUT blank screen (Issue 10 validation)", async ({ page }) => {
        await login(page, users.admin.username, users.admin.password);

        await page.goto("/admin/tickets", { waitUntil: "networkidle" });
        await page.getByText(ticketTitle).click();

        // Delete (confirm dialog auto-accepted by dialog handler)
        page.on("dialog", async (d) => await d.accept());

        await Promise.all([
            page.waitForResponse((r) => r.url().includes("/tickets") && (r.status() === 200 || r.status() === 204)),
            page.getByRole("button", { name: /delete/i }).click(),
        ]);

        // ✅ CRITICAL: header must remain visible (no blank screen / no logout)
        await expect(page.locator("header")).toBeVisible();

        // ✅ Must return to list OR show “not found” gracefully
        // Accept either behavior, but NO crash.
        await page.waitForTimeout(1000);

        // Ensure not stuck on empty layout
        await expect(page.locator("body")).toContainText(/tickets|dashboard|admin/i);

        await page.screenshot({ path: `./screenshots/admin-after-delete.png`, fullPage: true });
    });
});
