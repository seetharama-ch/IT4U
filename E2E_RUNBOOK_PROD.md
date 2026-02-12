# IT4U PROD E2E Runbook

This runbook details how to execute the End-to-End (E2E) tests for the IT4U application in the Production Environment.

## ⚠️ Critical Safety Warnings
> [!IMPORTANT]
> **PROD ONLY**: These tests are configured to run against `https://gsg-mecm` ONLY.
> **NO DB RESET**: Database cleaning/seeding is DISABLED. Tests rely on existing data or create their own transactional data (which they should attempt to clean up, though soft deletes are safer).

## Prerequisites
- Node.js (v18+)
- Playwright (`npm install`)
- Valid PROD Credentials for:
    - Admin: `admin` / `admin123`
    - Manager: `manager_mike` / `password`
    - Employee: `employee_john` / `password`
    - IT Support: `support_sara` / `password`

## Configuration
The configuration file is `frontend/playwright.config.ts`.
- **Base URL**: Hardcoded to `https://gsg-mecm`.
- **Safety**: Throws error if `PLAYWRIGHT_BASE_URL` env var attempts to override to non-prod.

## Running Tests

### 1. Run All PROD Tests
Executes all spec files in the `e2e` directory.
```bash
cd frontend
npx playwright test
```

### 2. Run Specific Issue Validations
To verify specific fixes:

**Issue 1: User Validation** (Fixes 500 error on blank create)
```bash
npx playwright test user_creation_validation.spec.ts
```

**Issue 2: Admin Approval Override** (Fixes "Manager Pending" stuck state)
```bash
npx playwright test ticket_lifecycle_admin_override.spec.ts
```

**Issue 3: IT Support Assign** (Fixes "Access Denied" on self-assign)
```bash
npx playwright test ticket_assign_to_me_support.spec.ts
```

**Issue 4: IT Support Close** (Fixes "Access Denied" on close)
```bash
npx playwright test ticket_close_support.spec.ts
```

### 3. Debugging
- **Headed Mode**: See the browser actions.
  ```bash
  npx playwright test --headed
  ```
- **UI Mode**: Interactive debugger.
  ```bash
  npx playwright test --ui
  ```

## Troubleshooting
- **Tests Timeout (30s) or Fail to Find Element**: 
    - Verify the user credentials are correct in the spec file.
    - Manually log in to `https://gsg-mecm` to ensure the environment is healthy.
    - Check if "Admin Actions" or "Manager Approval" panels are visible for the user.
- **"Ticket created successfully" not found**:
    - Backend might be returning 500. Check backend logs (`java.exe` console output).
