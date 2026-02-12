# System Health Checks Runbook

Use this guide to verify the operational status of the IT4U system.

## 1. Quick API Health Check
*   **Endpoint:** `GET /actuator/health`
*   **Command:** `curl http://localhost:8061/actuator/health`
*   **Expected Response:** `{"status":"UP"}`

## 2. API Info & Build Version
*   **Endpoint:** `GET /actuator/info`
*   **Command:** `curl http://localhost:8061/actuator/info`
*   **Check:** Verify `build.version` matches expected release.

## 3. Database Connectivity
Check the Backend logs for connection signals.
*   **Log Location:** `D:\Apps\NetPulse\logs\backend.log` (or `console` if running interactively)
*   **Keywords to grep:** `HikariPool`, `Connected to PostgreSQL`, `Flyway`

## 4. Email Service Connectivity
*   **Check:** Verify `spring.mail.host` (smtp.office365.com) is reachable from the server.
*   **Test:** `Test-NetConnection smtp.office365.com -Port 587` in PowerShell.

## 5. Frontend Accessibility
*   **URL:** `http://gsg-mecm:9092`
*   **Check:** Page loads, Login screen appears.
*   **Sidebar:** Ensure "Dashboard", "Tickets", "Users" links appear after login.
