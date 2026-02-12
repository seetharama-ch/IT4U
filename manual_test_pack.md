# E2E Test Scenarios

## Setup
1. **Enable Debug**: `localStorage.setItem("it4u.debug","true")` -> Reload.

## Phase A: Admin (User Creation)
- **Login**: `admin` / `admin`
- **Actions**:
    - Create Manager: `manager_e2e` / `manager_e2e@example.com` / `password` (Role: MANAGER)
    - Create Support: `support_e2e` / `support_e2e@example.com` / `password` (Role: IT_SUPPORT)
    - Create Employee: `employee_e2e` / `employee_e2e@example.com` / `password` (Role: EMPLOYEE, Manager: `manager_e2e`)

## Phase B: Employee (Ticket Creation)
- **Login**: `employee_e2e` / `password`
- **Actions**: Create 4 tickets
    1. **Hardware**: "Monitor Flickering" (Desc: "Screen blacks out")
    2. **Software**: "Install VS Code" (Desc: "Dev tools needed")
    3. **Access**: "Reset MFA" (Desc: "Lost device")
    4. **Network**: "Slow Wifi" (Desc: "Cant connect")
- **Verify**: All 4 visible in list.

## Phase C: Manager (Approvals)
- **Login**: `manager_e2e` / `password`
- **Actions**:
    - **Approve**: "Monitor Flickering" (Hardware) -> Priority: MEDIUM
    - **Approve**: "Install VS Code" (Software)
    - **Reject**: "Reset MFA" (Access) -> Comment: "Use self-service portal"

## Phase D: Support (Fulfillment)
- **Login**: `support_e2e` / `password`
- **Actions**:
    - Open "Monitor Flickering"
    - **Assign**: To Me
    - **Status**: IN_PROGRESS
    - **Comment**: "Ordering cable"

## Verification
- Capture screenshots of lists and details.
- Capture console logs if possible.
