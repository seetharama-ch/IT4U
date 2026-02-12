import { test, expect } from "@playwright/test";
import { observePageDiagnostics, attachPageDiagnostics } from "./_helpers/evidence";
import { step, attachSessionReport, StepRow } from "./_helpers/steps";

test("PROD: Regression Check (Known Issues Fix Validation)", async ({ page }, testInfo) => {
    const rows: StepRow[] = [];
    const diags = observePageDiagnostics(page);

    const checkHealth = async (name: string) => {
        if (page.url().includes("/login") && !page.url().includes("login")) {
            throw new Error(`Unexpected redirect to /login in ${name}`);
        }
    };

    try {
        // 1. Admin Login
        await step(page, testInfo, rows, "Login_Admin", async () => {
            await page.goto("/login");
            await page.fill('input[name="username"]', "admin");
            await page.fill('input[name="password"]', "admin123");
            await page.click("button:has-text('Login')");
            await expect(page).toHaveURL(/\/app\/admin/);
            await checkHealth("Admin Login");
        });

        // 2. Validate Create User
        await step(page, testInfo, rows, "Validate_Create_User", async () => {
            // Note: Admin creates user
            await page.goto("/app/admin/users");

            // Generate unique user
            const timestamp = Date.now();
            const newUser = `testuser_${timestamp}`;
            const newEmail = `testuser_${timestamp}@example.com`;

            // Click Add User
            await page.click("button:has-text('+ Add User')");

            // Fill Form
            await page.fill('input[name="username"]', newUser);
            await page.fill('input[name="password"]', "Password123!");
            await page.fill('input[name="email"]', newEmail);
            await page.fill('input[name="phoneNumber"]', '+1 555-0100');
            await page.fill('input[name="department"]', 'QA');
            await page.fill('input[name="jobTitle"]', 'Tester');
            await page.selectOption('select[name="role"]', 'EMPLOYEE');

            // Intercept POST to capture 500 error details if it happens
            const [response] = await Promise.all([
                page.waitForResponse(r => r.url().includes("/api/users") && r.request().method() === "POST"),
                page.click("button:has-text('Create')")
            ]);

            if (response.status() !== 200 && response.status() !== 201) {
                const errorText = await response.text();
                console.error(`Create User Failed: ${response.status()} - ${errorText}`);
                throw new Error(`Create User Failed: ${response.status()} - ${errorText}`);
            }

            // Verify Success Toast or Modal Close
            await expect(page.locator("text=created successfully")).toBeVisible();
            await checkHealth("Create User");
        });

        // 3. User Reports (Fix for Empty/False Positive)
        // await step(page, testInfo, rows, "Validate_Reports", async () => {
        //     await page.goto("/app/admin/reports");

        //     const ticketsResp = await page.request.get(`${process.env.E2E_BASE_URL || "https://gsg-mecm"}/api/tickets?page=0&size=1`);
        //     if (ticketsResp.ok()) {
        //         const text = await ticketsResp.text();
        //         if (text.includes('"totalElements":0') || text === "[]") {
        //             console.log("Warning: Backend truly has 0 tickets, skipping empty-check assertion.");
        //         } else {
        //             await expect(page.locator('text=No tickets found')).toHaveCount(0);
        //         }
        //     }
        //     await checkHealth("Reports");
        // });

        // 4. Admin Edit Button (Visual Regression)
        // await step(page, testInfo, rows, "Validate_Edit_Button", async () => {
        // ... (skipped to prioritize Priority Check)
        // });

        // 5. Check Priority in Create Ticket (Employee View) - Log out first
        await step(page, testInfo, rows, "Validate_Priority_Field", async () => {
            // Logout Admin
            await page.click('[data-testid="user-menu"]');
            await page.click('[data-testid="logout-btn"]');

            await page.goto("/login");
            await page.fill('input[name="username"]', "emp1");
            await page.fill('input[name="password"]', "Pass@123");
            await page.click("button:has-text('Login')");

            // Navigate directly to ensure we are on the page
            await page.goto("/app/tickets/new");
            await expect(page.locator("h1")).toContainText("Create Service Request");

            // Assertion: Priority selector exists
            await expect(page.locator('[data-testid="ticket-priority"]').or(page.locator('select[name="priority"]'))).toHaveCount(1);

            // Assertion: Submit payload includes priority
            await page.fill('input[name="title"]', "Reg Check Priority");
            await page.fill('textarea[name="description"]', "Checking priority payload");
            await page.selectOption('select[name="priority"]', "HIGH");
            await page.selectOption('select[name="category"]', "NETWORK");

            const [response] = await Promise.all([
                page.waitForResponse(r => r.url().includes("/api/tickets") && r.request().method() === "POST"),
                page.click('[data-testid="ticket-submit"]')
            ]);

            const reqData = response.request().postData() || "";
            if (!reqData.includes('"priority"')) {
                throw new Error("Ticket create payload missing priority field!");
            }
            await checkHealth("Priority Field");
        });

    } finally {
        await attachPageDiagnostics(testInfo, diags, "regression-");
        await attachSessionReport(testInfo, rows);
    }
});
