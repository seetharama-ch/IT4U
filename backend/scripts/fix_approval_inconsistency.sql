-- Fix 1: Closed/Resolved tickets should have NA approval status if currently PENDING
UPDATE tickets 
SET manager_approval_status = 'NA' 
WHERE status IN ('CLOSED', 'RESOLVED') AND manager_approval_status = 'PENDING';

-- Fix 2: Rejected tickets (approval rejected) should be CLOSED if currently PENDING_MANAGER_APPROVAL
UPDATE tickets
SET status = 'CLOSED'
WHERE manager_approval_status = 'REJECTED' AND status = 'PENDING_MANAGER_APPROVAL';
