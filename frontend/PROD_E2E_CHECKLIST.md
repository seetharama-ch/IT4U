# IT4U Production E2E Validation - Final Execution Checklist

**Target**: `https://gsg-mecm`  
**Mode**: REAL BROWSER (Chrome/Edge visible)  
**Date**: 2025-12-27

---

## ✅ PRE-FLIGHT CHECKLIST

### 1. Production URL Verification

```powershell
# Test URL is reachable
Test-NetConnection -ComputerName gsg-mecm -Port 443

# Open in browser manually
Start-Process "https://gsg-mecm/login"
```

**Confirm**:
- [ ] Login page loads
- [ ] No certificate errors (or accepted)
- [ ] Footer visible on login page

---

### 2. Production Services Running

**Backend**:
```powershell
# Check health endpoint
Invoke-WebRequest -Uri "https://gsg-mecm/api/actuator/health" -UseBasicParsing
```

**Expected**: `{"status":"UP"}`

**Frontend**:
- [ ] Production build deployed (NOT `npm run dev`)
- [ ] Accessible at `https://gsg-mecm`

---

### 3. Test Accounts Ready

**Minimum Required**:
- [ ] `admin / Admin@123` (or actual password)
- [ ] `emp1 / Emp@123` (or equivalent employee)
- [ ] `employee_john / password` (if exists)

**Verify by manual login**:
```
1. Open https://gsg-mecm/login
2. Login as admin → Should see admin dashboard
3. Logout
4. Login as emp1 → Should see employee dashboard
```

---

### 4. Playwright Configuration

**File**: `playwright.prod.config.ts`

**MUST HAVE**:
```typescript
use: {
  baseURL: 'https://gsg-mecm',   // ✅ Real URL
  headless: false,               // ✅ Real browser
  channel: 'chrome',             // ✅ Chrome/Edge
  video: 'on',                   // ✅ Evidence
  ignoreHTTPSErrors: true,       // ✅ Self-signed certs
}
```

**Verify**:
```powershell
# Check config
cat frontend/playwright.prod.config.ts | Select-String "headless"
# Should show: headless: false
```

---

## 🎬 EXECUTION STEPS

### Step 1: Run Multi-Tab + Footer Test

```powershell
cd frontend

# Run single test with REAL BROWSER
$env:E2E_BASE_URL='https://gsg-mecm'
npx playwright test multi_tab_multi_user.spec.ts --config=playwright.prod.config.ts --headed --workers=1
```

**What You MUST SEE** (visually):
- ✅ Chrome browser opens (visible window)
- ✅ Navigates to `https://gsg-mecm/login`
- ✅ Footer text: "Crafted by Seetharam © GeoSoftGlobal-Surtech International"
- ✅ Two tabs open: one admin, one employee
- ✅ Both dashboards show footer
- ✅ No session collision on refresh

**Duration**: ~2-3 minutes

---

### Step 2: Run Session Timeout Test

```powershell
# Run with test mode for faster timeout
$env:E2E_BASE_URL='https://gsg-mecm'
$env:IT4U_SESSION_TEST_MODE='true'
npx playwright test session_timeout.spec.ts --config=playwright.prod.config.ts --headed --workers=1
```

**What You MUST SEE**:
- ✅ Login → Dashboard with footer
- ✅ Wait ~2 minutes (test mode)
- ✅ Session expiry modal appears
- ✅ Countdown timer visible
- ✅ "Stay Logged In" button works
- ✅ No forced logout at 5 minutes

**Duration**: ~3-5 minutes (test mode)

---

### Step 3: Run Full PROD Suite

```powershell
# All tests against production
$env:E2E_BASE_URL='https://gsg-mecm'
$env:IT4U_SESSION_TEST_MODE='true'
npx playwright test --config=playwright.prod.config.ts --headed --workers=1
```

**Expected**:
- Multiple test files execute sequentially
- Each test opens real browser
- Evidence collected automatically

**Duration**: ~15-20 minutes

---

## 📊 VISUAL CONFIRMATION CHECKLIST

While tests run, **watch the browser** and confirm:

### Footer Validation
- [ ] Footer visible on `/login`
- [ ] Footer visible on `/app/admin`
- [ ] Footer visible on `/app/employee`
- [ ] Footer text correct: "Crafted by Seetharam © GeoSoftGlobal-Surtech International"

### Multi-Tab Login
- [ ] Tab 1: Admin dashboard loaded
- [ ] Tab 2: Employee dashboard loaded
- [ ] Both tabs stay logged in after refresh
- [ ] No role confusion between tabs

### Session Timeout
- [ ] Session warning modal appears
- [ ] Modal shows countdown timer
- [ ] "Stay Logged In" button visible
- [ ] Clicking button keeps user logged in
- [ ] No auto-logout before timeout

---

## 📁 EVIDENCE COLLECTION

After tests complete:

```powershell
# View HTML report (interactive)
npx playwright show-report

# List all test results
Get-ChildItem test-results -Recurse -Include *.webm,*.png,*.zip
```

**Required Evidence**:
- [ ] `playwright-report/index.html` exists
- [ ] Videos in `test-results/**/video.webm`
- [ ] Screenshots (if failures) in `test-results/**/*.png`
- [ ] Traces in `test-results/**/trace.zip`

**Open Trace for Debugging**:
```powershell
npx playwright show-trace test-results/<test-folder>/trace.zip
```

---

## 🐛 IF TESTS FAIL

### Failure Response Protocol

1. **DO NOT IGNORE** ⚠️

2. **Collect Evidence**:
   - Open video: Shows exact failure point
   - Open trace: Shows network, console, DOM
   - Open screenshot: Shows error state

3. **Identify Root Cause**:
   - **Frontend bug**: Wrong selector, missing footer, UI issue
   - **Backend bug**: 401/403/500 errors, session issues
   - **Environment**: URL wrong, services down, credentials invalid
   - **Test bug**: Incorrect assertion, timing issue

4. **Fix and Rerun**:
   ```powershell
   # Fix code/config
   # Restart services if needed
   
   # Rerun ONLY failed test
   npx playwright test <filename>.spec.ts --config=playwright.prod.config.ts --headed
   
   # If passes, rerun full suite
   npx playwright test --config=playwright.prod.config.ts --headed --workers=1
   ```

---

## ✅ FINAL ACCEPTANCE CRITERIA

### GO / NO-GO Decision

**Mark YES only if ALL are true**:

- [ ] Browser was **visible** (not headless)
- [ ] Tests ran against **`https://gsg-mecm`** (not localhost)
- [ ] Footer validated on login + all dashboards
- [ ] Multi-tab login validated (admin + employee)
- [ ] Session timeout popup validated
- [ ] Evidence exists (video + trace + HTML report)
- [ ] **No critical failures remain**

### If ALL ✅ above:

**Status**: 🎉 **PROD VALIDATED**

**Sign-off**:
```
Tester: [Name]
Date: 2025-12-27
Environment: https://gsg-mecm
Browser: Chrome (visible)
Evidence: playwright-report/index.html
Result: PASS - All validations complete
```

---

## 📋 POST-VALIDATION ACTIONS

### 1. Generate Final Report

```powershell
# Open report
npx playwright show-report

# Export results
Copy-Item playwright-report -Destination "../docs/prod_e2e_report_2025-12-27" -Recurse
```

### 2. Document Results

Create: `docs/prod_e2e_final_report.md`

Include:
- Test execution date/time
- Production URL tested
- Pass/fail summary
- Evidence paths
- Known issues (if any)
- Sign-off

### 3. Archive Evidence

```powershell
# Create archive
Compress-Archive -Path test-results,playwright-report -DestinationPath "prod_e2e_evidence_2025-12-27.zip"
```

---

## 🔧 TROUBLESHOOTING

### Browser Doesn't Open

**Cause**: `headless: true` in config

**Fix**:
```typescript
// playwright.prod.config.ts
use: {
  headless: false,  // MUST be false
  channel: 'chrome',
}
```

### Tests Use Localhost

**Cause**: Wrong config or hardcoded URLs

**Fix**:
```powershell
# Always set env var
$env:E2E_BASE_URL='https://gsg-mecm'

# Verify no localhost in tests
Select-String -Path "e2e/**/*.ts" -Pattern "localhost"
```

### Session Timeout Test Hangs

**Cause**: Test mode not enabled

**Fix**:
```powershell
$env:IT4U_SESSION_TEST_MODE='true'
```

### Footer Not Found

**Cause**: Footer not deployed or wrong test-id

**Fix**:
1. Manually check `https://gsg-mecm/login` for footer
2. Inspect element for `data-testid="app-footer"`
3. Rebuild and redeploy if missing

---

**Checklist Complete** - Ready for production validation! 🚀
