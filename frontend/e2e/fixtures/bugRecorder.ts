import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

type BugLog = {
    testTitle: string;
    url?: string;
    consoleErrors: string[];
    pageErrors: string[];
};

export const test = base.extend<{ bugLog: BugLog }>({
    bugLog: async ({ }, use, testInfo) => {
        const bugLog: BugLog = {
            testTitle: testInfo.title,
            consoleErrors: [],
            pageErrors: [],
        };
        await use(bugLog);

        // write per-test bug json (even if passed, this helps auditing)
        const outDir = path.join(testInfo.outputDir, 'buglog');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(
            path.join(outDir, 'buglog.json'),
            JSON.stringify(bugLog, null, 2),
            'utf-8'
        );
    },
});

export { expect };
