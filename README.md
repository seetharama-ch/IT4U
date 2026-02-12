# IT4U - Service Portal (v1.4)

IT4U is a modern internal ticketing system designed for employees, managers, and IT support staff to streamline request management and approval workflows.

## Version 1.4 Release Notes (Dec 2025)
- **Production Ready:** Full support for Azure AD SSO and Microsoft 365 SMTP.
- **Verification:** Comprehensive Regression Test Suite (E2E & API).
- **Environment:** Dedicated Production Profile (Port 8060, Postgres).
- **Security:** Enhanced Role-Based Access and SQL Injection protection.

## Project Structure
- `frontend/`: React + Vite application (Dev Port 5173)
- `backend/`: Spring Boot 3 + Java 17 application (Dev Port 8080, Prod Port 8060)
- `deploy_prod.ps1`: Automated build & deployment script.
- `verify_deployment.ps1`: Post-deployment verification script.
- `deployment_guide.md`: Detailed SOP for Production Setup.

## Prerequisite
- Java 17 (JDK)
- Node.js (v20+)
- PostgreSQL 14+
- Maven (Embedded `mvnw` or local installation)

## Setup & Run (Local Development)

### 1. Backend
```powershell
cd backend
mvn spring-boot:run
```
*   API runs at `http://localhost:8080/api`
*   **Default Admin:** `admin` / `password`

### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
```
*   UI available at `http://localhost:5173`

## Deployment Guide (Production)

Please refer to **`deployment_guide.md`** for the complete Standard Operating Procedure.

### Quick Start (Automation)
1.  Open PowerShell in the project root.
2.  Run the build script:
    ```powershell
    .\deploy_prod.ps1
    ```
3.  Run the artifact with Production Profile:
    ```powershell
    java -jar backend/target/it4u-1.4.0.jar --spring.profiles.active=prod
    ```
    *   **Port:** 8060
    *   **Docs:** `deployment_guide.md`

## User Roles & Credentials (Test Data)

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `password` | System Administrator |
| **Manager** | `Ilapanda_Jeevan Kumar` | `Geosoft@1234` | Engineering Manager |
| **Employee** | `Vuyyuri_Vijay Kumar` | `Geosoft@1234` | Reports to Ilapanda |
| **IT Support** | `it_support_jane` | `password` | Support Agent |

## Functional Features
1.  **Dashboard:** Role-specific views (My Tickets, Team Approvals, All Tickets).
2.  **Create Ticket:** Dynamic forms based on Category (Hardware, Software, Access, Network).
3.  **Approval Flow:**
    *   **Employee** submits request.
    *   **Manager** receives request in "Team Approvals".
    *   **Manager** Approves/Rejects.
    *   **IT Support/Admin** fulfills approved requests.
4.  **User Management:**
    *   **CSV Upload:** Bulk onboarding.
    *   **Manual:** Add/Edit users individually via Admin Dashboard.

---
*GSG IT4U Portal - v1.2 - Dec 2025*
