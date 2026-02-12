import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    testDir: './tests',
    timeout: 180000,
    expect: { timeout: 15000 },
    use: {
        baseURL: process.env.IT4U_BASE_URL || 'http://localhost:5173', // Testing against Vite Dev Server
        headless: false,
        viewport: { width: 1366, height: 768 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
    preserveOutput: 'always',
    reporter: [['html', { open: 'never' }], ['list']],
});

