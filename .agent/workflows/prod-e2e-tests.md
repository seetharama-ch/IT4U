---
description: Run production E2E tests with automatic bug capture and reporting
---

# Run Production E2E Tests with Auto Bug Capture

This workflow runs E2E tests against a production-like environment and generates bug reports.

## Prerequisites

1. Backend JAR built: `backend/target/it4u-1.4.1.jar`
2. Frontend dependencies installed: `npm ci` in frontend folder

## Steps

### 1. Start Backend in Production Mode

```powershell
cd D:\Workspace\gsg-IT4U\backend
java -jar .\target\it4u-1.4.1.jar --spring.profiles.active=prod --server.port=8060
```

Keep this terminal running.

### 2. Build and Preview Frontend

In a new terminal:

```powershell
cd D:\Workspace\gsg-IT4U\frontend
npm run build
npm run preview -- --port 4173
```

Keep this terminal running.

### 3. Set Environment Variables and Run Tests

In a new terminal:

// turbo-all
```powershell
cd D:\Workspace\gsg-IT4U\frontend
$env:E2E_BASE_URL="http://localhost:4173"
$env:E2E_API_URL="http://localhost:8060/api"
npm run e2e:prod
```

### 4. Generate Bug Report

After tests complete:

// turbo
```powershell
npm run e2e:report
```

### 5. Review Results

- Open `test-results/BUG_REPORT.md` for summary
- Open `playwright-report/index.html` for detailed results
- Check `test-results/` folder for artifacts (videos, traces, screenshots)

## Output

- **Bug Report**: `frontend/test-results/BUG_REPORT.md`
- **HTML Report**: `frontend/playwright-report/index.html`
- **Artifacts**: `frontend/test-results/` (videos, traces, screenshots, bug logs)

## Re-run Single Test

```powershell
cd D:\Workspace\gsg-IT4U\frontend
npx playwright test e2e/it4u_e2e_ticket_lifecycle.spec.ts --headed --workers=1
```
