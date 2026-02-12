# IT4U Production Deployment Runbook (Standardized)

**Goal:** Zero port drift, single source of truth.

## Service Info
*   **Service Name:** IT4U-Backend
*   **Port:** 8060 (Fixed in application.properties)
*   **Health:** http://localhost:8060/actuator/health

## Deployment Workflow (Strict)

### 1. Stop & Verify
```powershell
nssm stop IT4U-Backend
# Run verification tool
d:\Workspace\gsg-IT4U\tools\verify-ports.ps1
# Ensure 8060 is NOT listening
```

### 2. Build
```powershell
cd d:\Workspace\gsg-IT4U\backend
mvn -DskipTests clean package
```

### 3. Deploy
```powershell
# Ensure target directory exists
if (!(Test-Path "D:\Apps\IT4U\backend")) { New-Item -ItemType Directory -Path "D:\Apps\IT4U\backend" -Force }

Copy-Item "d:\Workspace\gsg-IT4U\backend\target\it4u-1.4.1.jar" "D:\Apps\IT4U\backend\it4u-1.4.1.jar" -Force
```

### 4. Start & Verify
```powershell
nssm start IT4U-Backend
Write-Host "Waiting for startup..."
Start-Sleep -Seconds 15

# Verify Port
d:\Workspace\gsg-IT4U\tools\verify-ports.ps1

# Verify Health
curl http://localhost:8060/actuator/health
```
