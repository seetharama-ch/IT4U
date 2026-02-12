# GSC – Version Update Document (VUD)

**Project:** GSG-IT4U / GSC Portal
**Maintained By:** ChatGPT (IDE Instructions)
**Purpose:** Track every change, feature addition, bug fix, UI improvement, backend update, and deployment instruction across versions.

## ✅ Current Versions

| Version | Release Date | Status |
| :--- | :--- | :--- |
| **GSC-1.1** | 12-2025 | Archived |
| **GSC-1.2** | 12-2025 | Latest Stable |
| **GSC-1.3** | 12-2025 | New – In Progress |
| **GSC-1.4** | 12-2025 | Production Safety & Automation |

---

## 📌 VERSION DETAILS

### 🔷 Version: GSC-1.1
**Release Date:** December 2025
**Status:** Previous Stable Release

**Included Features:**
- Initial setup of portal
- Base UI (Login, Dashboard, Ticket Views)
- Backend structure created (Spring Boot)
- Postgres integration
- Authentication using basic JWT
- Basic employee module
- Admin module (limited)
- Basic monitoring agent draft

**Known Issues (Closed in 1.2):**
- UI breaking on some screens
- Admin tabs non-functional
- **Requirement documents created:**
  - PRD
  - Deployment Guide
  - UI Kit
  - Dashboard mockups
  - Network monitoring application blueprint

**Bug Fixes:**
- Non-working admin buttons fixed
- Employee course start issue fixed
- Frontend build path issues resolved
- Backend prod run issue fixed (Spring profiles)
- Wrong static folder clearing issue addressed

**Improvements:**
- Professional UI/UX structure defined
- Dark/Light mode support added (instruction level)
- Style guide prepared for developer
- File upload engine design included
- Audio + slide + quiz admin module finalized

### 🔷 Version: GSC-1.2 (Recent Stable)
**Release Date:** December 9, 2025
**Focus:** UI/UX Overhaul, Theme System, Accessibility.

**Key Features:**
- **Centralized Theme System:**
    - Implemented CSS variable-based theming for consistent Light/Dark modes in `index.css`.
    - Added global theme toggle with persistence in `ThemeContext`.
    - Refactored core components (Dashboard, Tickets, Users, Modals) to use semantic theme variables.
- **Accessibility Improvements:**
    - Audited and updated colors to meet WCAG AA contrast standards (e.g., standardizing on Green-700 (#15803d) for light mode text).
    - Removed hardcoded hex values in favor of centralized variables.
- **Code Maintenance:**
    - Resolved CSS lint warnings by replacing `@apply` with standard CSS in utility layers.
    - Fixed TypeScript lint errors in User Management components.
- **User Management:**
	- Bulk Import (CSV)
	- Manual User Creation/Edit/Delete

### 🆕 🔷 Version: GSC-1.3 – Notification Enhancement Release
**Status:** In Development / Planned
**Release Window:** December 2025
**Scope:** Email Notification System for Ticket Lifecycle

**📌 New Feature: Ticket Email Notifications**
- **Trigger: Employee Creates a Ticket**
    - Email to Employee (Confirmation)
    - Email to Manager (Approval Required)
    - Email to IT Support (Pre-notification)
- **Trigger: Manager Approves Ticket**
    - Email to IT Support (Action Required)
- **Future Scope:** SMS, Push Notifications, WhatsApp API.

**🛠 Technical Requirements for GSC-1.3**
- **Event Handlers:** `TicketCreatedEvent`, `TicketApprovedByManagerEvent`
- **Notification Service:** Async methods for sending emails.
- **Configuration:** `application.yml` updates for SMTP.

**📄 CHANGE LOG (Updated)**
| Date | Version | Change Type | Description |
| :--- | :--- | :--- | :--- |
| 12-Dec-2025 | GSC-1.3 | Feature Added | Ticket creation email notifications (Employee, Manager, IT Support) |
| 12-Dec-2025 | GSC-1.3 | Feature Added | Manager approval triggers email to IT Support |
| 12-Dec-2025 | GSC-1.3 | Documentation | PRD updated for notification system |
| 12-Dec-2025 | GSC-1.3 | Documentation | Deployment Guide updated with email server setup (SMTP) |
| 12-Dec-2025 | GSC-1.3 | Documentation | API spec updated for Notification Events |

---

## 📝 IDE Instruction (Permanent)

The IDE must follow these rules:

**✔ 1. Maintain this Version Update Document automatically.**
Whenever **ANY** change is made in:
- UI
- Backend
- API
- Database
- Build & Deployment
- New feature
- Bug fix
- UI/UX improvement
- Admin panel changes

→ update this VUD immediately.

**✔ 2. Keep versions sequential:**
Next versions will be:
- GSC-1.4
- GSC-1.5
…

**✔ 3. Maintain separate files inside project docs folder:**
- `/docs/versions/VERSION_HISTORY.md`
- `/docs/versions/CHANGELOG.md`
- `/docs/versions/CURRENT_VERSION.md`

**✔ 4. Include the version number inside every build:**
For example: `version: GSC-1.3 (In Development)`

**📌 Next Version: GSC-1.5**

### 🔷 Version: GSC-1.4 (Production Hardening)
**Release Date:** December 15, 2025
**Focus:** Production Safety, Automation, and Audit.

**Key Features:**
- **Production Test Mode:** `IT4U_TEST_MODE` env var triggers `qa_` user prefix and `QA-PROD-` ticket prefix.
- **Email Audit API:** New endpoint `/api/admin/notifications` to verify email triggers without checking inboxes.
- **Automated Verification:** Full Playwright suite for Production Ticket Lifecycle (`prod_*.spec.ts`).

**Change Log:**
| Date | Version | Change Type | Description |
| :--- | :--- | :--- | :--- |
| 15-Dec-2025 | GSC-1.4 | Safety | Added `IT4U_TEST_MODE` logic to UserService and TicketController |
| 15-Dec-2025 | GSC-1.4 | Automation | Added Playwright prod config and 5-stage lifecycle tests |
| 15-Dec-2025 | GSC-1.4 | Audit | Added Notification Audit API for admin verification |
