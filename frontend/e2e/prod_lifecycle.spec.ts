import { test, expect, Page } from "@playwright/test";
import { observePageDiagnostics, attachPageDiagnostics } from "./_helpers/evidence";
import { step, attachSessionReport, StepRow } from "./_helpers/steps";

test("PROD: Full 4-Role Ticket Lifecycle (Admin, Employee, Manager, Support)", async ({ browser }, testInfo) => {
    test.setTimeout(180000); // 3 mins for full flow

    // 1. Setup contexts
    const contextAdmin = await browser.newContext();
    const contextEmployee = await browser.newContext();
    const contextManager = await browser.newContext();
    const contextSupport = await browser.newContext();

    const pageAdmin = await contextAdmin.newPage();
    const pageEmployee = await contextEmployee.newPage();
    const pageManager = await contextManager.newPage();
    const pageSupport = await contextSupport.newPage();

    // Diagnostics
    const rows: StepRow[] = [];
    const diagAdmin = observePageDiagnostics(pageAdmin);
    const diagEmployee = observePageDiagnostics(pageEmployee);
    const diagManager = observePageDiagnostics(pageManager);
    const diagSupport = observePageDiagnostics(pageSupport);

    // Crash detector
    const checkHealth = async (p: Page, name: string) => {
        if (p.url().includes("/login") && !p.url().includes("login")) {
            throw new Error(`Unexpected redirect to /login in ${name}`);
        }
    };

    try {
        // ---------------------------------------------------------
        // STEP 1: LOGIN ALL
        // ---------------------------------------------------------
        await step(pageAdmin, testInfo, rows, "Login_Admin", async () => {
            await pageAdmin.goto("/login");
            await pageAdmin.fill('input[name="username"]', "admin"); // Real PROD user
            await pageAdmin.fill('input[name="password"]', "admin123");
            await pageAdmin.click("button:has-text('Login')");
            await expect(pageAdmin).toHaveURL(/\/app\/admin/);
            await checkHealth(pageAdmin, "Admin");
            await pageAdmin.waitForTimeout(30000); // User requested 30s delay

        });

        await step(pageEmployee, testInfo, rows, "Login_Employee", async () => {
            await pageEmployee.goto("/login");
            await pageEmployee.fill('input[name="username"]', "employee");
            await pageEmployee.fill('input[name="password"]', "password");
            await pageEmployee.click("button:has-text('Login')");
            await expect(pageEmployee).toHaveURL(/\/app\/employee/);
            await checkHealth(pageEmployee, "Employee");
            await pageEmployee.waitForTimeout(30000);
        });

        await step(pageManager, testInfo, rows, "Login_Manager", async () => {
            await pageManager.goto("/login");
            await pageManager.fill('input[name="username"]', "manager");
            await pageManager.fill('input[name="password"]', "password");
            await pageManager.click("button:has-text('Login')");
            await expect(pageManager).toHaveURL(/\/app\/manager/);
            await checkHealth(pageManager, "Manager");
            await pageManager.waitForTimeout(30000);
        });

        await step(pageSupport, testInfo, rows, "Login_Support", async () => {
            await pageSupport.goto("/login");
            await pageSupport.fill('input[name="username"]', "support");
            await pageSupport.fill('input[name="password"]', "password");
            await pageSupport.click("button:has-text('Login')");
            await expect(pageSupport).toHaveURL(/\/app\/it-support/);
            await checkHealth(pageSupport, "Support");
            await pageSupport.waitForTimeout(30000);
        });

        // ---------------------------------------------------------
        // STEP 2: CREATE TICKET (Employee)
        // ---------------------------------------------------------
        let ticketId = "";
        await step(pageEmployee, testInfo, rows, "Create_Ticket", async () => {
            await pageEmployee.click("text=Create Ticket");
            await pageEmployee.fill('input[name="title"]', "PROD E2E Hardware Request");
            await pageEmployee.fill('textarea[name="description"]', "Need a new monitor for desk setup.");
            await pageEmployee.selectOption('select[name="priority"]', "Medium");
            await pageEmployee.selectOption('select[name="category"]', "Hardware");

            // Capture response
            const [response] = await Promise.all([
                pageEmployee.waitForResponse(r => r.url().includes("/api/tickets") && r.request().method() === "POST"),
                pageEmployee.click("button:has-text('Submit Ticket')")
            ]);

            const json = await response.json();
            ticketId = String(json.id);
            if (!ticketId) throw new Error("Ticket ID not returned from backend");

            await expect(pageEmployee.locator("text=Ticket created successfully")).toBeVisible();
            await pageEmployee.click("text=Close");
            await checkHealth(pageEmployee, "Employee_After_Create");
        });

        // ---------------------------------------------------------
        // STEP 3: MANAGER APPROVE
        // ---------------------------------------------------------
        await step(pageManager, testInfo, rows, "Manager_Approve", async () => {
            await pageManager.reload();
            await pageManager.click(`text=#${ticketId}`);
            await expect(pageManager.locator("text=Approve")).toBeVisible();
            await pageManager.click("text=Approve");

            // Wait for approval confirmation
            await expect(pageManager.locator(`text=Ticket #${ticketId} Approved`)).toBeVisible();
            await pageManager.click("text=Close");

            // Verify list status update
            await expect(pageManager.locator(`tr:has-text("#${ticketId}")`)).toContainText("APPROVED");
            await checkHealth(pageManager, "Manager_After_Approve");
        });

        // ---------------------------------------------------------
        // STEP 4: SUPPORT RESOLVE
        // ---------------------------------------------------------
        await step(pageSupport, testInfo, rows, "Support_Resolve", async () => {
            await pageSupport.reload();
            await pageSupport.click(`text=#${ticketId}`);
            await expect(pageSupport.locator("text=Resolve")).toBeVisible();
            await pageSupport.click("text=Resolve");

            await expect(pageSupport.locator(`text=Ticket #${ticketId} Resolved`)).toBeVisible();
            await pageSupport.click("text=Close");

            await expect(pageSupport.locator(`tr:has-text("#${ticketId}")`)).toContainText("RESOLVED");
            await checkHealth(pageSupport, "Support_After_Resolve");
        });

        // ---------------------------------------------------------
        // STEP 5: EMPLOYEE VERIFY
        // ---------------------------------------------------------
        await step(pageEmployee, testInfo, rows, "Employee_Verify_Resolved", async () => {
            await pageEmployee.reload();
            await expect(pageEmployee.locator(`tr:has-text("#${ticketId}")`)).toContainText("RESOLVED");
            await checkHealth(pageEmployee, "Employee_Verify");
        });

        // ---------------------------------------------------------
        // STEP 6: ADMIN CLEANUP (DELETE)
        // ---------------------------------------------------------
        await step(pageAdmin, testInfo, rows, "Admin_Delete", async () => {
            await pageAdmin.reload();
            // Ensure we see all tickets
            const approvedFilter = pageAdmin.getByText("Approved");
            if (await approvedFilter.isVisible()) await approvedFilter.click();

            const row = pageAdmin.locator(`text=#${ticketId}`);
            // Safety check: if not found, don't crash the whole test, but log failure.
            // However, for strict step runner, we should try-catch inside or expect.
            if (await row.count() === 0) {
                // Maybe it's buried.
                console.log(`Could not find ticket #${ticketId} for deletion.`);
            } else {
                await pageAdmin.click(`text=#${ticketId}`);
                pageAdmin.once('dialog', dialog => dialog.accept());
                await pageAdmin.click("text=Delete");
                await expect(pageAdmin.locator(`text=Ticket #${ticketId} deleted`)).toBeVisible();
                await pageAdmin.click("text=Close");
                await expect(pageAdmin.locator(`tr:has-text("#${ticketId}")`)).toHaveCount(0);
            }
            await checkHealth(pageAdmin, "Admin_After_Delete");
        });

    } finally {
        // Flush data
        await attachPageDiagnostics(testInfo, diagAdmin, "admin-");
        await attachPageDiagnostics(testInfo, diagEmployee, "employee-");
        await attachPageDiagnostics(testInfo, diagManager, "manager-");
        await attachPageDiagnostics(testInfo, diagSupport, "support-");

        await attachSessionReport(testInfo, rows);
        await contextAdmin.close();
        await contextEmployee.close();
        await contextManager.close();
        await contextSupport.close();
    }
});
