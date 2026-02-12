import { test, expect } from "@playwright/test";

test('sanity check app', async ({ page }) => {
    console.log("Navigating to https://gsg-mecm/login");
    const response = await page.goto('https://gsg-mecm/login');
    console.log(`Navigation complete. Status: ${response?.status()}`);

    await page.screenshot({ path: 'sanity-page.png' });
    console.log("Screenshot taken.");

    const title = await page.title();
    console.log(`Title: ${title}`);
    expect(title).toBeTruthy();

    // Try to find input
    console.log("Looking for input (waiting 5s)...");
    await page.waitForTimeout(5000); // Give React time to render

    const inputCount = await page.locator('input').count();
    console.log(`Found ${inputCount} inputs.`);

    if (inputCount === 0) {
        console.log("No inputs found. Dumping body innerHTML:");
        const body = await page.evaluate(() => document.body.innerHTML);
        console.log(body);
    } else {
        await page.locator('input').first().type("test");
        console.log("Filled input.");
    }

    console.log("Sanity test passed!");
});
