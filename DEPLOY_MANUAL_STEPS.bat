@echo off
REM IT4U Production Deployment - Manual Steps
REM This file documents the manual steps needed because PowerShell lacks admin privileges

echo ================================================================
echo IT4U PRODUCTION DEPLOYMENT MANUAL STEPS
echo ================================================================
echo.
echo IMPORTANT: These commands MUST be run in an Administrator PowerShell window
echo Right-click PowerShell and select "Run as Administrator"
echo.
echo ================================================================
echo STEP 1: Stop IIS to release file locks
echo ================================================================
echo.
echo     net stop was /y
echo.
pause
echo.
echo ================================================================
echo STEP 2: Clear target directory
echo ================================================================
echo.
echo     Remove-Item "C:\inetpub\wwwroot\gsg-mecm\*" -Recurse -Force
echo.
pause
echo.
echo ================================================================
echo STEP 3: Deploy new build
echo ================================================================
echo.
echo     Copy-Item "D:\Workspace\gsg-IT4U\frontend\dist\*" "C:\inetpub\wwwroot\gsg-mecm" -Recurse -Force
echo.
pause
echo.
echo ================================================================
echo STEP 4: Start IIS
echo ================================================================
echo.
echo     net start w3svc
echo.
pause
echo.
echo ================================================================
echo STEP 5: Verify deployment
echo ================================================================
echo.
echo     curl.exe -k https://gsg-mecm/ | Select-String "IT4U_BUILD_MARKER"
echo.
echo Expected: IT4U_BUILD_MARKER: 2025-12-27_10:07 IST
echo.
echo ================================================================
echo DEPLOYMENT COMPLETE
echo ================================================================
pause
