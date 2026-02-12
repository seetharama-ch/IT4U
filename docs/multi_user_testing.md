# Multi-User Testing Guide

## Problem
Browser cookies (including `JSESSIONID`) are shared across all tabs in the same browser window. This means you cannot login as different users simultaneously in multiple tabs of the same window.

## Solution: Playwright Multi-Context

Playwright's **browser contexts** provide complete isolation, including separate cookies. This allows testing multiple users simultaneously.

## How to Use in Tests

### Example: Admin + Employee Parallel Login

```typescript
test('Multi-user test', async ({ browser }) => {
  // Context 1: Admin
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/login');
  // ... login as admin
  
  // Context 2: Employee (ISOLATED cookies)
  const empContext = await browser.newContext();
  const empPage = await empContext.newPage();
  await empPage.goto('/login');
  // ... login as employee
  
  // Both users are logged in simultaneously!
  
  // Cleanup
  await adminContext.close();
  await empContext.close();
});
```

### Key Benefits

- ✅ Complete session isolation
- ✅ Different cookies per context
- ✅ No interference between users
- ✅ Perfect for role-based testing

## Manual Testing (Browser)

For manual multi-user testing, use:

1. **Incognito/Private Windows**: Each private window has isolated cookies
2. **Different Browser Profiles**: Chrome profiles have separate cookie jars
3. **Different Browsers**: Firefox + Chrome + Edge

### Example: Test Admin + Employee Manually

1. **Window 1** (Normal): Login as `admin`
2. **Window 2** (Incognito): Login as `employee_john`
3. Both users remain logged in independently

## References

- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts)
- See: `frontend/e2e/multi_context_login.spec.ts`
