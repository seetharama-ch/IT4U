import { Page, expect } from "@playwright/test";
import path from "path";

export async function createTicketWithAttachment(page: Page, title: string) {
    await page.goto("/tickets", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /create ticket|new ticket/i }).click();

    await page.getByLabel(/title/i).fill(title);
    await page.getByLabel(/description/i).fill("E2E test ticket - created by Playwright");

    const filePath = path.resolve(__dirname, "../data/sample-attachment.txt");

    // update selector if your input differs
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await Promise.all([
        page.waitForResponse((r) => r.url().includes("/tickets") && r.status() < 400),
        page.getByRole("button", { name: /submit|create/i }).click(),
    ]);

    // Confirm ticket appears
    await expect(page.getByText(title)).toBeVisible();
}

export async function openTicketDetails(page: Page, title: string) {
    await page.getByText(title).first().click();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText(title)).toBeVisible(); // This might fail if the title is not in the details view
}
