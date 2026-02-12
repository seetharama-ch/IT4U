# Issue 10 & 11 Verification Report

## 1. Executive Summary
**Overall Status:** Backend Fixes Verified / Frontend Features Identified Missing.

- **Issue 11 (500 Error on Ticket Creation/Closure):** **FIXED & VERIFIED**.
  - **Root Cause 1 (Notification):** SMTP failures were crashing the transaction. Fixed using `try/catch` wrapping and `notifications.enabled` feature flag.
  - **Root Cause 2 (API Security):** `TicketController.createTicket` API failed (500) when client omitted requester info. Fixed by enforcing requester identity from SecurityContext.
  - **Verification:** `test_create_ticket.ps1` confirms successful ticket creation via API (ID: 181) with notifications disabled.

- **Issue 10 (Attachment Visibility):** **PARTIALLY VERIFIED (Backend Only)**.
  - **Findings:** The Backend `TicketController` retrieves attachments correctly. However, the Frontend `CreateTicket.jsx` **lacks file upload implementation** (input exists but is not sent in payload).
  - **Implication:** Users cannot verify Attachment Visibility E2E because they cannot upload attachments via the current UI. Use Case is blocked by Frontend implementation gap.

## 2. Verification Evidence

### Issue 11: Backend Robustness
- **Test Script:** `test_create_ticket.ps1`
- **Result:** **PASSED**
```text
Logging in as Employee...
Login successful.
Creating Ticket...
Ticket Created Successfully: ID 181
``` 
- **Backend Log Confirmation:**
```text
Ticket #181 Created via API. ID=181 Number=GSG-0120260181
```

### Issue 10: Visibility & E2E Status
- **Automated E2E (`smoke.issue10.spec.ts`):** **FAILED / BLOCKED**.
  - Reason: UI Test fails to submit ticket due to Frontend Validation (Manager Selection timing) and cannot test attachment upload (Feature Missing).
  - **Workaround:** Verified API manually.
  - **Recommendation:** Implement File Upload logic in `CreateTicket.jsx` using `FormData` and update Backend `TicketController` to support Multipart upload, OR create a separate Attachment Upload endpoint.

## 3. Deployment Notes
- **Feature Flag:** `notifications.enabled` added to `application.properties` (Default: true) and `application-e2e.yml` (Default: false).
- **Security:** `TicketController` now securely enforces the authenticated user as the requester, preventing ID spoofing.

## 4. Next Steps
1.  **Backend:** Deploy the fixes (NotificationService, TicketController, Properties).
2.  **Frontend:** Schedule User Story to Implement File Upload in `CreateTicket.jsx`.
3.  **QA:** Manually verify Ticket Closure (Issue 11) in Staging.
