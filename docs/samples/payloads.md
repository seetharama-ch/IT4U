# Payload Samples

Use these JSON payloads to test API endpoints via Swagger UI or Postman.

## 1. Create a Ticket
**Endpoint:** `POST /api/tickets`
```json
{
  "title": "AutoCAD not launching",
  "description": "AutoCAD 2024 crashes on startup with error code 0x800",
  "category": "SOFTWARE",
  "priority": "HIGH",
  "approverManagerUsername": "manager1",
  "deviceId": 101,
  "affectedUser": "john.doe" 
}
```
*Note: `affectedUser` is optional if creating for self.*

## 2. Manager Approval
**Endpoint:** `POST /api/tickets/{id}/approve`
*(Note: Use `PATCH /api/tickets/{id}/approval` if utilizing the newer endpoint structure)*

**Payload (Standard):**
```json
{
  "decision": "APPROVED",
  "comment": "Approved. Please assist ASAP."
}
```

## 3. Admin / IT Support Actions
**Endpoint:** `PATCH /api/tickets/{id}/admin-actions`

### Assign & Move to In Progress
```json
{
  "assignedTo": "it_support_jane",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "comment": "Picking up this ticket for investigation."
}
```

### Resolve Ticket
```json
{
  "status": "RESOLVED",
  "comment": "Issue fixed by reinstalling drivers. User confirmed working."
}
```

### Close Ticket
```json
{
  "status": "CLOSED",
  "comment": "Ticket closed as per policy."
}
```

## 4. Add Comment
**Endpoint:** `POST /api/tickets/{id}/comments`
```json
{
  "content": "Can you please provide the screenshot of the error?"
}
```

## 5. Negative Test Cases
*   **Invalid Status Transition:** Try moving `OPEN` -> `RESOLVED` directly without assignment. Expect `400 Bad Request`.
*   **Manager Approval Bypass:** Try moving to `IN_PROGRESS` while Manager Approval is `PENDING`. Expect `400 Bad Request`.
*   **Unauthorized Upload:** Try uploading `.exe` file. Expect `400` or `415`.
