# E2E Regression Report
**Date**: 2025-12-14
**Environment**: DEV (Frontend: localhost:5173, Backend: localhost:8060)
**Suite**: `full-regression.spec.ts`

## Summary
The comprehensive E2E regression suite was successfully executed against the DEV environment. All critical functional and security scenarios passed.

- **Total Tests**: 11
- **Passed**: 11
- **Failed**: 0
- **Pass Rate**: 100%
- **Status**: 🟢 **PASS**

## Verified Scenarios
| ID | Scenario | Status | Notes |
|---|---|---|---|
| 4.1 | App Boot + SPA Fallback | PASS | Verified correct redirection to Login/OAuth for unauthenticated users. |
| 4.2 | Legacy Redirects | PASS | Confirmed `/create` and `/new-ticket` redirect to `/app/tickets/new`. |
| 4.3 | Auth Session Isolation | PASS | Verified API returns 401 or redirects to IDP when no session exists. |
| 4.4 | Role Routing | PASS | Verified landing pages for EMPLOYEE, MANAGER, IT_SUPPORT, and ADMIN. |
| 4.5 | Ticket Dashboard API | PASS | Verified Manager dashboard triggers correct `/api/tickets/approvals` calls. |
| 4.6 | Ticket Creation Flow | PASS | Verified User can create tickets with required fields (Title, Desc, Category). |
| 4.7 | Admin User Management UI | PASS | Verified responsiveness and visibility of Actions column on mobile/desktop. |
| 4.8 | Security Access Checks | PASS | **CRITICAL FIX**: Confirmed that `/api/users` is now blocked (403) for non-admins. |

## Key Findings & Fixes
During the verification process, several critical issues were identified and resolved:
1.  **Security Vulnerability**: The `/api/users` endpoint was previously accessible to authenticated non-admins. **Fixed** by restricting it to the `ADMIN` role in `SecurityConfig.java`.
2.  **Login Configuration**: The default `SecurityConfig` inadvertently blocked `/api/auth/login`, preventing UI login. **Fixed** by explicitly permitting this endpoint.
3.  **Test Credential Alignment**: Updated test suite to use correct seeded users (`employee_john`, `manager_mike`, etc.) instead of generic mocks.

## PROD Run Instructions
To execute this suite against the Production build (Single Jar):

1.  **Build Frontend**:
    ```bash
    cd frontend
    npm run build
    ```
2.  **Package Backend (with Embedded Frontend)**:
    Copy `frontend/dist` content to `backend/src/main/resources/static` (or ensure maven plugin handles it).
    ```bash
    cd backend
    mvn clean package -DskipTests
    ```
3.  **Run Production Jar**:
    ```bash
    java -jar target/it4u-1.4.0.jar --spring.profiles.active=prod --server.port=8060
    ```
4.  **Run Tests**:
    ```bash
    cd frontend
    npx playwright test e2e/full-regression.spec.ts --project=prod
    ```
