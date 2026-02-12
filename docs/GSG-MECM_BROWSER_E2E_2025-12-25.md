# Browser-Based Manual E2E Testing Report
**Date:** 2025-12-25
**Tester:** (Human)

## 0. Setup & Pre-requisites
- [ ] Evidence folder created: `D:\IT4U_BROWSER_E2E\2025-12-25\`
- [ ] Attachments prepared: `E2E_attach.png`, `E2E_attach.pdf`
- [ ] 4 Incognito Windows Open (Admin, Employee, Manager, Support)

## 1. Phase A: Admin E2E
### A1. Admin Login
- [ ] Dashboard Loads
- [ ] Screenshot: Admin Dashboard (Required)

### A2. Create Users
**Users Created:**
- Manager: `manager_ui_20251225`
- Employee: `employee_ui_20251225` (Reports to Manager UL)
- Support: `support_ui_20251225`
- [ ] Users persist in list
- [ ] Screenshot: Users List (Required)

### A3. Reset Password
- [ ] Reset `employee_ui_20251225` password to `E2E@12345`
- [ ] Screenshot: Success Message (Required)

### A4. Deactivate/Reactivate
- [ ] Deactivate Employee -> Login Fail
- [ ] Reactivate Employee -> Login Success
- [ ] Screenshot: Deactivate Status / Error Message (Required)

### A5. Email Audit Page
- [ ] Page Loads
- [ ] Screenshot: Email Audit List (Required)

**Phase A Result:** [PASS / FAIL]

---

## 2. Phase B: Employee E2E
### B1. Login
- [ ] Dashboard Loads
- [ ] Screenshot: Employee Dashboard (Optional)

### B2. Ticket Creation
| Ticket | Category | Title | Attachment | Ticket No. | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Hardware | UI-HW-20251225-01 | E2E_attach.png | | |
| 2 | Software | UI-SW-20251225-01 | E2E_attach.pdf | | |
| 3 | Access | UI-AC-20251225-01 | (None) | | |
| 4 | Network | UI-NW-20251225-01 | (None) | | |

**Validations:**
- [ ] Success Popup includes TicketNo
- [ ] Tickets appear in "My Tickets"
- [ ] Attachments downloadable from Details

**Screenshots (Required):**
- [ ] Success Popup
- [ ] My Tickets List
- [ ] Ticket Details with Attachment

**Phase B Result:** [PASS / FAIL]

---

## 3. Phase C: Manager E2E
### C1. Login
- [ ] Dashboard Loads

### C2. Approval Actions
- [ ] Hardware Ticket: **Approved**
- [ ] Software Ticket: **Approved**
- [ ] Access Ticket: **Rejected** (Comment: "Need more details")
- [ ] Timestamps visible? [Yes / No]

**Screenshots (Required):**
- [ ] Approvals Dashboard (Before)
- [ ] Ticket Status after decision (showing timestamp)

**Phase C Result:** [PASS / FAIL]

---

## 4. Phase D: IT Support E2E
### D1. Login
- [ ] Dashboard Loads

### D2. Validation & Assignment
- [ ] Validated Employee Attachments (Hardware/Software)
- [ ] Download worked? [Yes / No]
- [ ] Assigned Hardware Ticket to Self
- [ ] Added Comment: "Work started."
- [ ] Status -> **IN_PROGRESS**

**Screenshots (Required):**
- [ ] Attachment Panel
- [ ] IN_PROGRESS state + Comment

### D3. Resolution Chain
- [ ] Status -> **RESOLVED**
- [ ] Status -> **CLOSED**

**Screenshots (Required):**
- [ ] RESOLVED state
- [ ] CLOSED state

**Phase D Result:** [PASS / FAIL]

---

## 5. Email Flow Verification (Admin Audit)
**Lifecycle Events Confirmed:**
- [ ] Ticket Created
- [ ] Manager Approved / Rejected
- [ ] Status: IN_PROGRESS
- [ ] Status: RESOLVED
- [ ] Status: CLOSED

**Evidence:**
- [ ] Screenshot: Audit Log entries for TicketNo

**Result:** [PASS / FAIL]

---

## 6. Final Cross Check & Cleanup
- [ ] Employee Verification: Hardware Ticket is CLOSED, Comments visible.
- [ ] Admin: Ticket Deleted (Soft Delete) verified.

**Final Result:** [PASS / FAIL]

---

## Bugs / Issues Log
| ID | Phase | Description | Evidence (Screenshot/Log) |
| :--- | :--- | :--- | :--- |
| | | | |
