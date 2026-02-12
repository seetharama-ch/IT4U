import { Page, TestInfo } from "@playwright/test";
import { snap } from "./evidence";

export type StepRow = { step: string; status: "PASS" | "FAIL"; at: string; error?: string };

export async function step(page: Page, testInfo: TestInfo, rows: StepRow[], name: string, fn: () => Promise<void>) {
    const at = new Date().toISOString();
    try {
        await fn();
        await snap(page, testInfo, `PASS_${name}`);
        rows.push({ step: name, status: "PASS", at });
    } catch (e: any) {
        await snap(page, testInfo, `FAIL_${name}`);
        rows.push({ step: name, status: "FAIL", at, error: String(e?.message || e) });
        throw e;
    }
}

export async function attachSessionReport(testInfo: TestInfo, rows: StepRow[]) {
    const lines: string[] = [];
    lines.push(`# PROD E2E Session Report`);
    lines.push(`When: ${new Date().toISOString()}`);
    lines.push(`Test: ${testInfo.title}`);
    lines.push("");
    lines.push("## Steps");
    for (const r of rows) {
        lines.push(`- [${r.status}] ${r.step} (${r.at})${r.error ? ` :: ${r.error}` : ""}`);
    }
    lines.push("");
    lines.push("## Issues (Failing steps only)");
    const fails = rows.filter(r => r.status === "FAIL");
    if (!fails.length) lines.push(`- None`);
    else fails.forEach(f => lines.push(`- ${f.step} :: ${f.error || "Unknown error"}`));

    await testInfo.attach("session-report.md", { body: lines.join("\n"), contentType: "text/markdown" });
}
