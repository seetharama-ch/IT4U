# IT4U Runbook & User Guide

## 1. Introduction
IT4U is the internal ticketing system for GSG, facilitating IT support requests, hardware/software issues, and access management.

## 2. User Guide (Employee)
### How to Login
1. Navigate to the application URL.
2. **Local Login:** Enter your username and password.
3. **SSO Login:** Click "Login with Microsoft". Use your GSG credentials.

### How to Create a Ticket
1. Click **"New Ticket"** on the dashboard.
2. Enter a subject and description.
3. Select a **Category** related to your issue (e.g., Hardware, Software).
4. Select a **Priority** (Low, Medium, High).
5. Select your **Approving Manager** from the dropdown.
6. (Optional) Check **"Attach a file"** to upload screenshots/logs.
7. Click **"Submit Ticket"**.

### Tracking Status
- **My Tickets:** View all your open and closed tickets.
- **Statuses:**
    - `PENDING_MANAGER_APPROVAL`: Waiting for manager.
    - `APPROVED`: Manager approved, waiting for IT.
    - `IN_PROGRESS`: IT is working on it.
    - `RESOLVED`: IT has fixed the issue.
    - `REJECTED`: Manager denied request.

## 3. Manager Guide
### Approving Tickets
1. Login and go to **"Pending Approvals"**.
2. Click **"View"** on a ticket.
3. Review details and attachment.
4. Click **"Approve"** (advances to IT) or **"Reject"** (closes ticket).

## 4. IT Support & Admin Guide
### Handling Tickets
1. Login and view the **Dashboard**.
2. **Assign:** Open an unassigned ticket and click "Assign to Me".
3. **Update:** Change status to `IN_PROGRESS` while working.
4. **Resolve:** Change status to `RESOLVED` and add a comment explaining the fix.

### Email Audit (Admin Only)
- Go to **Admin Panel > Email Audit**.
- View logs of all emails sent or failed.
- Status `SENT`: Email exited system successfully.
- Status `SKIPPED`: User had no email or notifications disabled.
- Status `FAILED`: SMTP error.

### User Management
- **Access:** Admin Dashboard > User Management table.
- **Actions:**
    - **Edit (Pencil Icon):** Update user detailed info (Role, Department, Phone, etc.).
    - **Reset Password (Key Icon):** Set a new password for the user. Requires confirmation.
    - **Delete (Trash Icon):** Permanently remove a user.
- **Mobile Support:** The "Actions" column is sticky (pinned to the right) and remains visible when scrolling horizontally on small screens.

## 5. Operations & Deployment
### Deploy to Production (Windows)
1. Open PowerShell as Administrator.
2. Run validation: `. .\verify_deployment.ps1`
3. Run deployment script: `. .\deploy_prod.ps1`
4. The backend runs on port `8060`. Frontend on `80` (or `5173` if dev).

### 5.1 Routine Operations
- **Health Check:** `http://<server>:8060/actuator/health`
    - Expected Output: `{"status":"UP"}`
- **App Info:** `http://<server>:8060/actuator/info`
    - Displays version and environment info.
- **Startup Command (Prod):**
    ```sh
    java -jar target/it4u-backend-1.0.0.jar --spring.config.location=file:./config/application-prod.properties
    ```

### Configuration
- **Backend Properties:** `backend/config/application-prod.properties`
- **Environment Variables:**
    - `MAIL_PASSWORD`: SMTP Password.
    - `AZURE_CLIENT_SECRET`: SSO Secret.
    - `DB_PASSWORD`: Database Password.

### Troubleshooting
- **Email Not Sending:** Check `Email Audit` logs. If `FAILED`, check `MAIL_PASSWORD` and SMTP settings.
- **SSO 404/Error:** Ensure user exists in AD or Auto-provisioning is enabled (future). Check `application-prod.properties` for correct Tenant ID.
- **Attachments Fail:** Check `uploads` directory permissions.
