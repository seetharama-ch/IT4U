/**
 * Bug Capture Utility for Production E2E Tests
 * Captures evidence on test failures
 */

import { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface BugReport {
    id: string;
    testName: string;
    timestamp: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    component: string;
    description: string;
    expectedBehavior: string;
    actualBehavior: string;
    reproductionSteps: string[];
    evidence: {
        screenshot?: string;
        video?: string;
        trace?: string;
        consoleErrors: string[];
        networkFailures: any[];
    };
}

export class BugCapture {
    private bugs: BugReport[] = [];
    private consoleErrors: string[] = [];
    private networkFailures: any[] = [];

    constructor(private page: Page, private testInfo: TestInfo) {
        this.setupListeners();
    }

    private setupListeners() {
        // Capture console errors
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (!text.includes('401') && !text.includes('Unauthorized')) {
                    this.consoleErrors.push(`[${new Date().toISOString()}] ${text}`);
                }
            }
        });

        // Capture network failures
        this.page.on('response', (response) => {
            const status = response.status();
            if (status >= 400 && status !== 401) {
                this.networkFailures.push({
                    timestamp: new Date().toISOString(),
                    url: response.url(),
                    status,
                    statusText: response.statusText()
                });
            }
        });
    }

    /**
     * Capture bug on test failure
     */
    async captureBug(options: {
        severity: 'P0' | 'P1' | 'P2' | 'P3';
        component: string;
        description: string;
        expectedBehavior: string;
        actualBehavior: string;
        reproductionSteps: string[];
    }): Promise<BugReport> {
        const bugId = `BUG_${Date.now()}`;

        // Capture screenshot
        const screenshotPath = path.join(
            this.testInfo.outputDir,
            `${bugId}_screenshot.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });

        const bug: BugReport = {
            id: bugId,
            testName: this.testInfo.title,
            timestamp: new Date().toISOString(),
            severity: options.severity,
            component: options.component,
            description: options.description,
            expectedBehavior: options.expectedBehavior,
            actualBehavior: options.actualBehavior,
            reproductionSteps: options.reproductionSteps,
            evidence: {
                screenshot: screenshotPath,
                video: this.testInfo.attachments.find(a => a.name === 'video')?.path,
                trace: this.testInfo.attachments.find(a => a.name === 'trace')?.path,
                consoleErrors: [...this.consoleErrors],
                networkFailures: [...this.networkFailures]
            }
        };

        this.bugs.push(bug);
        return bug;
    }

    /**
     * Get all captured bugs
     */
    getBugs(): BugReport[] {
        return this.bugs;
    }

    /**
     * Save bugs to file
     */
    async saveBugsToFile(outputPath: string): Promise<void> {
        const content = JSON.stringify(this.bugs, null, 2);
        await fs.promises.writeFile(outputPath, content, 'utf-8');
    }
}

/**
 * Create BugCapture instance for a test
 */
export function createBugCapture(page: Page, testInfo: TestInfo): BugCapture {
    return new BugCapture(page, testInfo);
}
