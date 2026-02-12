import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.e2e from the current directory (frontend)
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

export default defineConfig({
    testDir: './e2e',
    timeout: 90_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.E2E_BASE_URL || 'https://gsg-mecm',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        ignoreHTTPSErrors: true,
    },
    reporter: [['html', { open: 'never' }], ['list']],
});
