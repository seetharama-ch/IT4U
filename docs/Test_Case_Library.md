# Test Case Library - IT4U

## 1. Authentication & Access Control

| TC ID | Title | Verified By | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Local Login - Employee | Automation | 1. Navigate to `/login`<br>2. Enter Employee credentials<br>3. Click "Sign in" | Redirect to Employee Dashboard. |
| **AUTH-02** | Local Login - Manager | Automation | 1. Navigate to `/login`<br>2. Enter Manager credentials<br>3. Click "Sign in" | Redirect to Manager Dashboard. |
| **AUTH-03** | Local Login - IT Support | Automation | 1. Navigate to `/login`<br>2. Enter IT credentials<br>3. Click "Sign in" | Redirect to IT Dashboard. |
| **AUTH-04** | Local Login - Admin | Automation | 1. Navigate to `/login`<br>2. Enter Admin credentials<br>3. Click "Sign in" | Redirect to Admin Dashboard. |
| **AUTH-05** | Login - Invalid Credentials | Automation | 1. Enter invalid username/password | Show error message "Invalid username or password". |
| **AUTH-06** | SSO Redirection | Automation | 1. Click "Login with Microsoft" | Redirect to `login.microsoftonline.com`. |
| **AUTH-07** | Role Restricted Access | Manual | 1. Login as Employee<br>2. Try to access `/admin/users` | Redirect to Dashboard or 403 Page. |

## 2. Ticket Lifecycle

| TC ID | Title | Verified By | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TKT-01** | Create Ticket - Happy Path | Automation | 1. Login as Employee<br>2. Click "New Ticket"<br>3. Fill details & Select Category<br>4. Select Manager<br>5. Submit | Ticket created with status `PENDING_MANAGER_APPROVAL`. |
| **TKT-02** | Manager Approval | Automation | 1. Login as Manager<br>2. Go to "Pending Approvals"<br>3. View Ticket -> Click "Approve" | Status changes to `APPROVED` (or `OPEN` for IT). |
| **TKT-03** | Manager Rejection | Automation | 1. Login as Manager<br>2. Go to "Pending Approvals"<br>3. View Ticket -> Click "Reject"<br>4. Enter reason | Status changes to `REJECTED`. |
| **TKT-04** | IT Support Assignment | Automation | 1. Login as IT Support<br>2. View Open/Approved Ticket<br>3. Click "Assign to Me" | Ticket assigned to current user. Status `IN_PROGRESS`. |
| **TKT-05** | Resolve Ticket | Automation | 1. Login as IT Support<br>2. View assigned ticket<br>3. Change status to `RESOLVED`<br>4. Enter resolution notes | Ticket status `RESOLVED`. |
| **TKT-06** | Close Ticket | Automation | 1. Login as Admin/IT<br>2. View Resolved ticket<br>3. Click "Close" | Ticket status `CLOSED`. |

## 3. Attachments & Features

| TC ID | Title | Verified By | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-01** | Upload Attachment | Manual | 1. Create Ticket<br>2. Toggle "Attach file"<br>3. Select file -> Submit | File uploaded and visible in Ticket Details. |
| **FEAT-02** | Download Attachment | Manual | 1. View Ticket with attachment<br>2. Click file link | File downloads correctly. |
| **FEAT-03** | Missing Email Handling | Automation | 1. Create User with blank email<br>2. Login & Create Ticket | Ticket created successfully. Audit log shows SKIPPED email. |

## 4. Email Triggers (Audit Log Verification)

| TC ID | Title | Verified By | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **EMAIL-01** | Confirmation Email | Backend Test | 1. Create Ticket | Audit Log: `TICKET_CREATED` -> `SENT` to Employee. |
| **EMAIL-02** | Approval Request | Backend Test | 1. Create Ticket with Manager | Audit Log: `MANAGER_APPROVAL_REQUESTED` -> `SENT` to Manager. |
| **EMAIL-03** | IT Notification | Backend Test | 1. Manager Approves | Audit Log: `MANAGER_APPROVED` -> `SENT` to IT Support. |
| **EMAIL-04** | Resolution Email | Backend Test | 1. Resolve Ticket | Audit Log: `TICKET_RESOLVED` -> `SENT` to Employee. |
