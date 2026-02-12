import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://gsg-mecm";

export default defineConfig({
    testDir: "./specs",
    timeout: 120_000,
    expect: { timeout: 20_000 },

    fullyParallel: false,
    retries: 1,
    workers: 1,

    reporter: [
        ["list"],
        ["html", { outputFolder: "../e2e-report", open: "never" }],
        ["junit", { outputFile: "../e2e-report/junit.xml" }],
    ],

    use: {
        baseURL: BASE_URL,
        headless: true,

        // ✅ no manual prompts / stable automation
        actionTimeout: 20_000,
        navigationTimeout: 45_000,

        // ✅ capture everything needed for confirmation
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        trace: "retain-on-failure",

        // ✅ reduce flakiness
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,

        // ✅ auto-handle dialogs (no user clicks)
        acceptDownloads: true,
        permissions: ["clipboard-read", "clipboard-write"],
        launchOptions: {
            args: [
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-notifications",
                "--disable-infobars",
                "--disable-popup-blocking",
            ],
        },
    },

    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
});
