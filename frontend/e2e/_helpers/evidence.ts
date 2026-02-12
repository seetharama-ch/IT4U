import { Page, TestInfo } from "@playwright/test";

export function stamp() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export async function snap(page: Page, testInfo: TestInfo, label: string) {
    const name = `${stamp()}__${label.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80)}.png`;
    const path = testInfo.outputPath("screenshots", name);
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`screenshot-${label}`, { path, contentType: "image/png" });
}

export type PageDiagnostics = {
    console: string[];
    errors: string[];
    network: string[];
};

export function observePageDiagnostics(page: Page): PageDiagnostics {
    const data: PageDiagnostics = { console: [], errors: [], network: [] };

    page.on("console", msg => {
        data.console.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", err => {
        data.errors.push(`[pageerror] ${String(err)}`);
    });

    page.on("requestfailed", req => {
        data.network.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText || "unknown"}`);
    });

    return data;
}

export async function attachPageDiagnostics(testInfo: TestInfo, data: PageDiagnostics, prefix: string = "") {
    await testInfo.attach(`${prefix}console.log`, {
        body: data.console.join("\n") || "(none)",
        contentType: "text/plain",
    });
    await testInfo.attach(`${prefix}pageerrors.log`, {
        body: data.errors.join("\n") || "(none)",
        contentType: "text/plain",
    });
    await testInfo.attach(`${prefix}requestfailed.log`, {
        body: data.network.join("\n") || "(none)",
        contentType: "text/plain",
    });
}
