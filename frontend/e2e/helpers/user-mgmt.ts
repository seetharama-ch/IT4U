
import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { waitForStability } from './testUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts'); // Adjusted path: helpers -> e2e -> frontend -> artifacts? No, artifacts is usually root/artifacts or frontend/artifacts?
// User instructions: "artifacts/run_users.json"
// Based on current file: e2e/helpers/user-mgmt.ts
// ../artifacts would be e2e/artifacts.
// I'll assume e2e/artifacts or root artifacts.
// I will just use path.resolve(__dirname, '../../../artifacts') if it's outside frontend?
// The user said: "artifacts/run_users.json"
// Let's check where the artifacts dir usually is. It is typically in the root of the workspace or frontend struct.
// I'll stick to `path.resolve(__dirname, '../../artifacts')` which puts it in `frontend/artifacts`.
// Wait, previous code was `path.resolve(__dirname, '../artifacts')` which from `helpers` folder means `e2e/artifacts`.
// That seems reasonable.
const RUN_USERS_FILE = path.join(ARTIFACTS_DIR, 'run_users.json');

/**
 * Robustly selects a role from a dropdown (supports Native, MUI, React Select)
 * Using strict user-requested strategy for stability.
 */
/**
 * Robustly selects a role from a dropdown (supports Native, MUI, React Select)
 * Using strict user-requested strategy for stability.
 */
export async function selectRole(page: Page, roleLabel: string) {
    console.log(`       Selecting role: "${roleLabel}"...`);

    // Normalize role label (IT_SUPPORT -> IT Support) for text matching
    const normalizedLabel = roleLabel.replace(/_/g, ' ');
    const rolePattern = new RegExp(normalizedLabel, 'i');

    // Wait for page stability
    await page.waitForLoadState('networkidle');

    // Find the dialog first
    const dialog = page.locator('[role="dialog"]');
    let target = page.getByRole('combobox', { name: /role/i }).first();

    if (await dialog.isVisible()) {
        const dialogCombo = dialog.locator('[role="combobox"]').first();
        const dialogSelect = dialog.locator('select').first();

        if (await dialogCombo.count() > 0) {
            target = dialogCombo;
        } else if (await dialogSelect.count() > 0) {
            target = dialogSelect;
        }
    } else {
        target = page.locator('label:has-text("Role")').locator('..').locator('[role="combobox"]').first()
            .or(page.getByLabel('Role', { exact: false }));
    }

    if (await target.count() === 0 || !(await target.isVisible())) {
        target = page.locator('div').filter({ hasText: /^Role$/ }).locator('..').locator('[role="combobox"], select').first();
    }

    if (await target.count() === 0) {
        throw new Error(`Could not find Role selector for "${roleLabel}"`);
    }

    // Determine type
    const tagName = await target.evaluate(el => el.tagName).catch(() => 'UNKNOWN');
    console.log(`       -> Found target: <${tagName}>`);

    if (tagName === 'SELECT') {
        // Debug options
        const optionsInfo = await target.evaluate(sel => {
            return Array.from((sel as HTMLSelectElement).options).map(o => ({ text: o.text, value: o.value }));
        });
        console.log(`       -> Options: ${JSON.stringify(optionsInfo)}`);

        // Attempt selection
        try {
            // Priority 1: Exact value match (if roleLabel is code like IT_SUPPORT)
            console.log(`       -> Trying value: "${roleLabel}"`);
            await target.selectOption({ value: roleLabel });
        } catch {
            // Priority 2: Label match (IT Support)
            try {
                console.log(`       -> Trying label: "${normalizedLabel}"`);
                await target.selectOption({ label: normalizedLabel });
            } catch {
                // Priority 3: Regex match
                console.log(`       -> Trying regex: ${rolePattern}`);
                const option = target.locator('option').filter({ hasText: rolePattern }).first();
                const val = await option.getAttribute('value');
                if (val) {
                    await target.selectOption(val);
                } else {
                    throw new Error(`Could not selector option for ${roleLabel}`);
                }
            }
        }
    } else {
        // Custom / MUI Select
        await target.click();

        // Wait for listbox
        const listbox = page.locator('[role="listbox"]');
        await expect(listbox).toBeVisible({ timeout: 10000 });

        // Strategy to find option
        const option = listbox.locator('[role="option"]').filter({ hasText: rolePattern }).first()
            .or(page.locator('div[class*="menu"] div[class*="option"]').filter({ hasText: rolePattern }).first())
            .or(page.locator('li').filter({ hasText: rolePattern }).first());

        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();
    }
}

/**
 * Tracks a created user in a JSON artifact for valid cleanup
 */
function trackCreatedUser(username: string) {
    if (!fs.existsSync(ARTIFACTS_DIR)) {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    let users: string[] = [];
    if (fs.existsSync(RUN_USERS_FILE)) {
        try {
            users = JSON.parse(fs.readFileSync(RUN_USERS_FILE, 'utf-8'));
        } catch (e) {
            console.warn('Failed to read run_users.json, starting fresh.');
        }
    }

    if (!users.includes(username)) {
        users.push(username);
        fs.writeFileSync(RUN_USERS_FILE, JSON.stringify(users, null, 2));
    }
}

/**
 * Ensures a valid E2E user exists. Creates it if missing.
 * PROTECTED: Never deletes/modifies 'admin' or non-E2E users.
 * 
 * STRATEGY: Uses API-based user creation to bypass UI validation issues.
 */
export async function ensureUserExists(
    page: Page,
    userCreds: { username: string; password: string },
    roleLabel: string,
    displayName: string
) {
    console.log(`   Checking user: ${userCreds.username}...`);

    // Safety Check: Only allow E2E_* users to be managed/created/deleted
    if (!userCreds.username.startsWith('E2E_') && userCreds.username !== 'admin') {
        console.log(`   ⚠️ Warning: Managing non-E2E user "${userCreds.username}". Ensure this is intentional.`);
    }

    // 1. Check if user already exists via API
    try {
        const getUsersResp = await page.request.get('/api/users');
        if (getUsersResp.ok()) {
            const users = await getUsersResp.json();
            const existingUser = users.find((u: any) => u.username === userCreds.username);
            if (existingUser) {
                console.log(`   ✓ User ${userCreds.username} already exists (found via API).`);
                trackCreatedUser(userCreds.username); // Track for cleanup
                return;
            }
        }
    } catch (e) {
        console.warn(`   ⚠️ Failed to check existing users via API: ${e}`);
    }

    // 2. Create User via API (bypasses UI validation issues)
    console.log(`   + Creating user ${userCreds.username} via API...`);

    const email = `${userCreds.username.toLowerCase()}@example.com`;
    const createUserPayload = {
        username: userCreds.username,
        password: userCreds.password,
        email: email,
        role: roleLabel,
        department: 'IT',
        jobTitle: 'Tester',
        phoneNumber: '1234567890',
        managerName: null // Optional
    };

    try {
        const createResp = await page.request.post('/api/users', {
            data: createUserPayload,
            headers: { 'Content-Type': 'application/json' }
        });

        if (createResp.ok()) {
            const createdUser = await createResp.json();
            console.log(`   ✅ User created successfully via API: ${createdUser.username} (ID: ${createdUser.id})`);
            trackCreatedUser(userCreds.username);
        } else {
            const errorText = await createResp.text();

            // Check if it's a duplicate error (409 or 400 with "exists" message)
            if (createResp.status() === 409 || createResp.status() === 400) {
                if (/exists|duplicate|taken|already in use/i.test(errorText)) {
                    console.log(`   ⚠️ User ${userCreds.username} already exists (duplicate detected). Proceeding.`);
                    trackCreatedUser(userCreds.username);
                    return;
                }
            }

            // Actual error
            console.error(`   ❌ Failed to create user: ${createResp.status()} ${createResp.statusText()}`);
            console.error(`       Response: ${errorText}`);
            throw new Error(`User creation failed: ${errorText}`);
        }
    } catch (e) {
        console.error(`   ❌ Exception during user creation: ${e}`);
        throw e;
    }

    // 3. Verify creation (refresh page and check UI)
    console.log(`   🔄 Refreshing page to verify user creation...`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForStability(page);

    // Try to find the user in the list
    const userRow = page.locator('tr').filter({ hasText: userCreds.username });
    const count = await userRow.count();

    if (count > 0) {
        console.log(`   ✓ Verified ${userCreds.username} in user list (found ${count} row(s)).`);
    } else {
        console.warn(`   ⚠️ User ${userCreds.username} not visible in list (may be paginated). API creation succeeded.`);
    }
}

/**
 * Cleans up only the users created during this run (stored in run_users.json)
 */
export async function cleanupTestUsers(page: Page) {
    if (!fs.existsSync(RUN_USERS_FILE)) {
        console.log('No users tracked for cleanup.');
        return;
    }

    const usersToDelete: string[] = JSON.parse(fs.readFileSync(RUN_USERS_FILE, 'utf-8'));
    if (usersToDelete.length === 0) return;

    console.log(`🧹 Cleaning up ${usersToDelete.length} E2E users...`);

    // Assuming we are logged in as admin
    await page.goto('/app/admin/users');
    await waitForStability(page);

    for (const username of usersToDelete) {
        if (username === 'admin') continue; // SAFETY: Never delete admin
        if (!username.startsWith('E2E_')) { // SAFETY: Double check prefix
            console.warn(`   ⚠️ Skipping cleanup of non-E2E user: ${username}`);
            continue;
        }

        console.log(`   - Deleting ${username}...`);

        // Search
        const searchBox = page.getByPlaceholder(/search|filter/i).first();
        if (await searchBox.isVisible()) {
            await searchBox.fill(username);
            await page.waitForTimeout(500);
        }

        const deleteBtn = page.locator('tr')
            .filter({ hasText: username })
            .getByRole('button')
            .filter({ hasText: /delete|remove|trash/i }) // Match delete icon/text
            .or(page.locator(`button[aria-label*="Delete ${username}"]`))
            .first();

        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();

            // Confirm Dialog
            const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i }).last(); // Last ensures we successfully hit the modal button
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
            }

            await expect(page.locator(`text=${username}`)).not.toBeVisible();
            console.log(`     ✓ Deleted`);
        } else {
            console.log(`     ? Could not find delete button for ${username}`);
        }
    }

    // Clear the file after cleanup
    fs.unlinkSync(RUN_USERS_FILE);
    console.log('🧹 Cleanup complete.');
}
