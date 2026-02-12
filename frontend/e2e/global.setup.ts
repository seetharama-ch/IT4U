import { request, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
    // Safe access to baseURL (check projects or specific override)
    const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:9092';

    const authDir = path.join(process.cwd(), 'e2e', '.auth');
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    const users = [
        { role: 'admin', username: 'admin', password: 'admin123' },
        { role: 'employee', username: 'employee', password: 'password' },
        { role: 'manager', username: 'manager', password: 'password' },
        { role: 'it_support', username: 'it_support_jane', password: 'password' },
    ];

    for (const user of users) {
        const fileName = path.join(authDir, `${user.role}.json`);
        const requestContext = await request.newContext({
            baseURL,
            ignoreHTTPSErrors: true
        });

        console.log(`Authenticating as ${user.role} (${user.username})...`);
        const response = await requestContext.post('/api/auth/login', {
            data: {
                username: user.username,
                password: user.password,
            },
        });

        if (response.ok()) {
            await requestContext.storageState({ path: fileName });
            console.log(`Saved auth state for ${user.role} to ${fileName}`);
        } else {
            console.error(`Failed to login as ${user.role}: ${response.status()} ${response.statusText()}`);
            throw new Error(`Auth failed for ${user.username}`);
        }

        await requestContext.dispose();
    }
}

export default globalSetup;
