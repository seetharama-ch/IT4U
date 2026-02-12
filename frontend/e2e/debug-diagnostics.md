# Phase A Debug Diagnostics

## What We've Implemented

### 1. Request/Response Logging
- All `/api/tickets` GET requests are now logged with:
  - Request URL (to see query params)
  - Response status
  - Total elements in response
  - First 5 ticket IDs
  - Whether the created ticket is in the response

### 2. Ticket Metadata Capture
- `ticketId`: Numeric ID (e.g., 123)
- `ticketNo`: Formatted ticket number (e.g., "GSG-2025-001")
- `createdAt`: Timestamp
- `managerApprovalStatus`: Should be 'NA' for admin-created tickets

### 3. Deterministic Waits
- Explicitly wait for network response after filter click
- Poll for ticket rows instead of using hard timeouts
- Clear console logging to trace execution flow

## How to Diagnose the Issue

### Run the Test
```bash
cd frontend
npx playwright test admin_ticket_delete.spec.ts --project=dev --headed
```

### Read the Console Output

#### Case 1: Ticket NOT in API Response
**Symptoms:**
```
Created ticket 123 in response: NO
```

**Root Causes:**
- Pagination issue (ticket on page 2+)
- Backend filter excludes NA status
- Ticket was deleted/not persisted
- Multi-tenant scoping issue

**Fixes:**
- Increase page size in frontend (change `size` from 20 to 50)
- Add backend filter support for managerApprovalStatus
- Verify ticket persistence after creation

#### Case 2: Ticket IN response but NOT rendered
**Symptoms:**
```
Created ticket 123 in response: YES
Total tickets in response: 5
PHASE A: FAILED - No ticket rows visible after filter click!
```

**Root Causes:**
- Frontend filtering logic bug
- React state not updating after fetch
- Rendering condition bug (e.g., `if (!tickets)` vs `if (tickets.length === 0)`)

**Fixes:**
- Add console.log in TicketList.jsx to trace state updates
- Check `getFilteredTickets()` logic
- Verify `displayedTickets` array is populated

#### Case 3: Ticket rendered but test can't see it
**Symptoms:**
```
Created ticket 123 in response: YES
Total tickets in response: 5
PHASE A: Ticket rows found: 5
(but test still fails at later assertion)
```

**Root Causes:**
- `data-testid="ticket-row"` not on correct element
- Locator is too specific or wrong
- Timing issue (rows rendered but content not loaded)

**Fixes:**
- Verify `data-testid="ticket-row"` is on `<tr>` element (line 650 in TicketList.jsx)
- Use more flexible locators
- Add explicit waits for row content

## Next Steps After Diagnosis

### If Case 1 (Backend/Filter Issue)
1. Check `/api/tickets` endpoint default page size
2. Add query param logging to see exact filters applied
3. Fix backend to include NA status in "Approved/Other" filter
4. Or: Navigate directly to ticket by ID instead of relying on list

### If Case 2 (Rendering Issue)
1. Add temporary logging to TicketList.jsx:
```javascript
useEffect(() => {
  console.log('TicketList rendered. Tickets:', tickets.length, 'Filter:', adminFilter);
  console.log('Displayed tickets:', getFilteredTickets().length);
}, [tickets, adminFilter]);
```
2. Fix state/rendering logic
3. Ensure `setTickets` is being called after fetch

### If Case 3 (Locator Issue)
1. Use Playwright inspector to verify element presence
2. Switch to more robust locators
3. Add `waitForSelector` before assertions

## Production-Ready Fix (Recommended)

Instead of relying on list visibility, use direct navigation:
1. Capture `ticketId` after creation ✅ (already done)
2. Navigate directly via URL: `/app/tickets/${ticketId}`
3. Verify ticket details load
4. Delete from details view
5. Verify hard delete (404 on GET)
6. Optionally verify list no longer shows it

This approach is more stable and tests the actual delete flow, not the list UI.
