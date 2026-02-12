# Full PROD E2E + Auto Bug Capture + Auto Report - Usage Guide

## Overview

This guide explains how to run production-like E2E tests with automatic bug capture and reporting for the IT4U application.

## Setup Instructions

### A) Preconditions (PROD-like stable environment)

Goal: Eliminate HMR/dev flakiness; use preview build and prod profile backend.

#### 1) Backend

Run backend in prod profile:

```powershell
cd D:\Workspace\gsg-IT4U\backend
java -jar .\target\it4u-1.4.1.jar --spring.profiles.active=prod --server.port=8060
```

#### 2) Frontend (preview)

```powershell
cd D:\Workspace\gsg-IT4U\frontend
npm ci
npm run build
npm run preview -- --port 4173
```

#### 3) Environment variables for tests

In PowerShell:

```powershell
$env:E2E_BASE_URL="http://localhost:4173"
$env:E2E_API_URL="http://localhost:8060/api"
```

## Running Tests

### Execute Production E2E Tests

```powershell
cd D:\Workspace\gsg-IT4U\frontend
npm run e2e:prod
```

This will:
- Run tests with `workers=1` (sequential) to reduce flakiness
- Run in headed mode for real browser testing
- Retry failed tests 2 times to detect flaky vs real bugs
- Capture video, trace, and screenshots on failure

### Generate Bug Report

After tests complete:

```powershell
npm run e2e:report
```

This generates `test-results/BUG_REPORT.md` with:
- Summary of all failures
- Error messages
- Links to artifacts (screenshots, videos, traces)
- Re-verify steps
- Commands to re-run specific tests

## Evidence Captured

For each failing test, the following artifacts are automatically captured:

- **Video**: `test-results/**/video.webm` - Full video recording of test execution
- **Trace**: `test-results/**/trace.zip` - Playwright trace for detailed debugging
- **Screenshots**: `test-results/**/*.png` - Screenshots on failure
- **Bug Logs**: `test-results/**/buglog/buglog.json` - Console and page errors
- **HTML Report**: `playwright-report/index.html` - Visual test results

## Bug Triage Workflow

If bugs are found after retries (real bugs, not flaky):

1. **Open Bug Report**: Review `test-results/BUG_REPORT.md`
2. **For Each Failure**:
   - Open `playwright-report/index.html` in browser
   - Click on the failed test
   - Open `trace.zip` to watch exactly where it breaks
   - Review attached console errors and page errors
   - Watch `video.webm` for visual context
   - Check screenshots for crash evidence

3. **Fix Code**: Only fix real bugs (not by adding sleeps)
4. **Re-run Specific Test**:
   ```powershell
   npx playwright test e2e/it4u_e2e_ticket_lifecycle.spec.ts --headed --workers=1
   ```

5. **If Still Failing**: Document in BUG_REPORT.md with severity:
   - **P0**: Crash / blank screen
   - **P1**: Wrong flow / cannot approve / cannot resolve
   - **P2**: UI issue
   - **P3**: Flaky timing

## Configuration Details

### Playwright Config

The `playwright.config.ts` includes:
- **Retries**: 2 (detects flaky vs real bugs)
- **Workers**: 1 (sequential execution)
- **Evidence Capture**: video, trace, screenshots on failure
- **Reporters**: HTML, list, JSON (for bug report generation)
- **Timeouts**: Extended for stability

### Bug Recorder Fixture

The `e2e/fixtures/bugRecorder.ts` fixture:
- Tracks console errors
- Tracks page errors (crashes)
- Generates per-test bug log JSON
- Auto-attaches errors to test results
- Captures crash screenshots

### Bug Report Generator

The `e2e/tools/generate_bug_report.js` script:
- Parses `results.json` from Playwright
- Extracts all failures
- Locates artifacts
- Generates markdown report with re-verify steps

## What You Get

✅ Full PROD-like E2E from scratch
✅ Evidence for each issue (video + trace + screenshots + logs)
✅ Automatic retry to separate flaky vs real bug
✅ Auto-generated bug list + reverify checklist (`BUG_REPORT.md`)
