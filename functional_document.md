# IT4U Portal - Functional Specification (v1.2)

## 1. Overview
The IT4U Portal is a unified service desk application designed to standardize how employees request IT services and how managers/admins process them. Version 1.2 introduces enhanced user management and robust approval workflows.

## 2. Core Modules

### 2.1 Authentication & Authorization
- **Hybrid Auth:** System supports standard Internal Database authentication.
- **Roles:**
  - `EMPLOYEE`: Can create/view own tickets.
  - `MANAGER`: Can create/view own tickets + Approve/Reject team tickets.
  - `IT_SUPPORT`: Can view/resolve all tickets.
  - `ADMIN`: Full system access, including User Management.

### 2.2 Ticket Management
- **Creation:** Dynamic forms tailored to category:
  - *Hardware:* Device details required.
  - *Software:* Software Name/Version required.
  - *Access/M365:* Account type required.
- **Lifecycle Statuses:** `OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`.
- **SLA Tracking:** Auto-calculated deadlines based on Priority (Critical=4h, High=8h, Medium=24h, Low=48h).

### 2.3 Approval Workflow
- **Trigger:** Tickets with categories `SOFTWARE`, `ACCESS_AND_M365`, `HARDWARE` automatically enter `PENDING` state.
- **Logic:**
  - Manager identified via `requester.manager` relationship.
  - Ticket remains locked from processing until `APPROVED`.
  - If `REJECTED`, the ticket workflow ends.

### 2.4 User Management (New in v1.2)
- **Manual Management (Admin Only):**
  - **Create User:** Add single user with specific Role, Dept, Job Title.
  - **Edit User:** Modify existing user details.
  - **Delete/Reset:** Remove users or reset passwords.
- **Bulk Import:**
  - CSV-based import for rapid onboarding.
  - Supports 2-phase import (Managers first, then Employees) to maintain hierarchy.

## 3. Deployment & Architecture
- **Frontend:** React SPA (Vite).
- **Backend:** Spring Boot REST API.
- **Database:** H2 (In-Memory for Dev) / PostgreSQL (Production Ready).
- **Deployment:** Single Executable JAR (Frontend resources embedded).
- **Version:** 1.2.0

## 4. Future Roadmap
- LDAP/AD Integration.
- Email Notifications (SMTP).
- Advanced Reporting / Analytics Dashboard.

## 5. QA / Testing
- **E2E Regression Test Suite**: Implemented for login + ticket lifecycle + notification emails.
- **Tools**: Playwright + Maildev.
- **Coverage**: Full "Happy Path" verification including email delivery to local SMTP.

 Manager Directory: Source of Manager Dropdown in Employee Create Ticket
