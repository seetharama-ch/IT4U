import { defineConfig, devices } from "@playwright/test";

// PROD ONLY - Prevent accidental runs against dev/test
const baseURL = process.env.E2E_BASE_URL || "https://gsg-mecm";

// HARD BLOCK anything not PROD URL
// if (!baseURL.startsWith("https://gsg-mecm")) {
//    throw new Error(`E2E_BASE_URL must be PROD only (https://gsg-mecm). Got: ${baseURL}`);
// }

export default defineConfig({
    testDir: "./e2e",
    testMatch: [
        "**/e2e/prod_lifecycle.spec.ts",
        "**/e2e/prod_regression.spec.ts",
        "**/e2e/repro_ticket_segregation.spec.ts",
        "**/e2e/user_creation_validation.spec.ts",
        "**/e2e/ticket_lifecycle_admin_override.spec.ts",
        "**/e2e/ticket_lifecycle_manager_approval.spec.ts",
        "**/e2e/attachments_flow.spec.ts",
        "**/e2e/prod_4role_login.spec.ts",
        "**/e2e/prod_new_user_lifecycle.spec.ts",
        "**/e2e/issue8_manager_approved_it_support_flow.spec.ts",
    ],
    timeout: 20 * 60 * 1000,
    expect: { timeout: 30_000 },
    fullyParallel: false,
    retries: 0,
    reporter: [
        ["list"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "playwright-results/results.xml" }],
    ],
    use: {
        baseURL,
        headless: false,
        launchOptions: {
            slowMo: 500,
        },
        screenshot: "on",
        video: "retain-on-failure",
        trace: "retain-on-failure",
        actionTimeout: 30_000,
        navigationTimeout: 60_000,
        ignoreHTTPSErrors: true,
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
