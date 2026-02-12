# ATTACHMENT FIX - MANUAL DEPLOYMENT STEPS

## Status
- ✅ Frontend code fixed (FileUploader.jsx)
- ✅ Backend config updated (application-prod.properties)
- ✅ Frontend built successfully
- ✅ E2E test created (attachments_flow_prod.spec.ts)

## Deploy Commands (Run sequentially)

### 1. Deploy Frontend
```powershell
# Copy built frontend to IIS
Copy-Item -Path "d:\Workspace\gsg-IT4U\frontend\dist\*" -Destination "C:\inetpub\wwwroot\gsg-mecm" -Recurse -Force
```

### 2. Rebuild Backend
```powershell
cd d:\Workspace\gsg-IT4U\backend
mvn clean package -DskipTests
```

### 3. Restart IIS
```powershell
iisreset
```

### 4. Verify/Create Storage Directory
```powershell
# Check if directory exists
Test-Path "D:\IT4U\storage\attachments"

# If not, create it
New-Item -Path "D:\IT4U\storage\attachments" -ItemType Directory -Force

# Set permissions for IIS App Pool
icacls "D:\IT4U\storage\attachments" /grant "IIS APPPOOL\gsg-mecm:(OI)(CI)M"
```

### 5. Restart Backend Service
If backend runs as a service:
```powershell
Restart-Service -Name "IT4U-Backend"
```

If backend runs manually, stop current process (Ctrl+C) and restart:
```powershell
cd d:\Workspace\gsg-IT4U\backend
java -jar target/it4u-1.4.1.jar --spring.profiles.active=prod
```

## Run E2E Test

### Run Test Against PROD
```powershell
cd d:\Workspace\gsg-IT4U\frontend
npx playwright test attachments_flow_prod.spec.ts --config=playwright.prod.config.ts
```

### View Test Report
```powershell
npx playwright show-report
```

## Expected Results

✅ Employee can upload attachments  
✅ Manager can view and download attachments
✅ File size validation works (>2MB rejected)  
✅ File type validation works (unsupported types rejected)
