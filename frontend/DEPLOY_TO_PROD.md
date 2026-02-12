# Quick Production Deployment Guide

## Current Status
✅ Footer code exists and works (verified locally)  
✅ Production build ready: `d:\Workspace\gsg-IT4U\frontend\dist\`  
❌ Production server not updated yet

---

## Deploy in 3 Steps

### 1. Find Production Web Root

Where is `https://gsg-mecm` served from?

**Common locations**:
- IIS: `C:\inetpub\wwwroot\gsg-mecm\`
- Apache: `/var/www/html/gsg-mecm/`
- Nginx: `/usr/share/nginx/html/`

**How to find**:
```powershell
# Check IIS sites
Get-IISSite | Select-Object Name, PhysicalPath

# Or manually check IIS Manager
```

### 2. Copy Files

```powershell
# Replace <PATH> with your actual production path
Copy-Item d:\Workspace\gsg-IT4U\frontend\dist\* <PATH> -Recurse -Force

# Example for local IIS:
Copy-Item d:\Workspace\gsg-IT4U\frontend\dist\* C:\inetpub\wwwroot\gsg-mecm -Recurse -Force
```

### 3. Verify & Test

```powershell
# 1. Clear browser cache (Ctrl+Shift+Delete)
# 2. Open https://gsg-mecm/login
# 3. Check footer exists:
#    DevTools Console: document.querySelector('[data-testid="app-footer"]')
#    Should return: <footer> element (not null)

# 4. Rerun E2E tests
cd d:\Workspace\gsg-IT4U\frontend
$env:E2E_BASE_URL='https://gsg-mecm'
npx playwright test multi_tab_multi_user.spec.ts --config=playwright.prod.config.ts --headed
```

---

## Alternative: Test Localhost First

Prove code works by testing against your running dev server:

```powershell
cd d:\Workspace\gsg-IT4U\frontend

# Test against localhost (npm run dev is already running)
$env:E2E_BASE_URL='http://localhost:5173'
npx playwright test multi_tab_multi_user.spec.ts --config=playwright.prod.config.ts --headed

# If passes → Deploy to production
# If fails → Code issue (not deployment)
```
