# Access Denied Root Cause Analysis

**Date:** 2025-12-29
**Environment:** PROD (`https://gsg-mecm`)

## 1. Failing Endpoint
- **URL Path:** `/api/tickets/{id}/admin`
- **Method:** `PUT`
- **Action:** Updating ticket status to `RESOLVED` or `CLOSED`, or changing assignee.

## 2. Reproduced Evidence
### Network Response (Captured via Playwright)
- **Status:** `403 Forbidden`
- **Response Body:**
```json
{
  "error": "FORBIDDEN",
  "message": "Access Denied",
  "cid": "dd892bdb-a416-4ce8-9513-c1922921317d"
}
```

### Backend Code Observation
In `TicketController.java:378`, the endpoint is restricted as follows:
```java
@PutMapping("/{id}/admin")
@org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> updateTicketAsAdmin(...)
```
This strictly limits the endpoint to users with the `ROLE_ADMIN` authority. IT Support users have `ROLE_IT_SUPPORT` and are thus rejected before reaching the service layer.

## 3. Root Cause Statement
The `/admin` ticket update endpoint incorrectly enforces an Admin-only restriction, even though the frontend UI exposes "Assign" and "Status" controls to IT Support users. While the backend has service-layer logic to prevent unauthorized status changes (only allowing resolution if assigned), the Controller layer blocks all IT Support interactions entirely.

## 4. Fix Plan
- Update `TicketController.java` to allow `hasAnyRole('ADMIN', 'IT_SUPPORT')` on the `updateTicketAsAdmin` method.
- Rely on existing `TicketService.updateStatus` business rules to enforce that IT Support can only resolve tickets they own.
