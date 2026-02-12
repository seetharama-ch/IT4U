-- CRITICAL: ORDER MATTERS FOR FOREIGN KEY CONSTRAINTS
-- Delete ticket-related data first
DELETE FROM ticket_attachments;
DELETE FROM ticket_comments;
DELETE FROM ticket_history;
DELETE FROM tickets;

-- Delete non-admin users
DELETE FROM users
WHERE role != 'ADMIN';

-- Verify counts
SELECT 'Tickets Count' as check_type, COUNT(*) as count FROM tickets
UNION ALL
SELECT 'Users Count' as check_type, COUNT(*) as count FROM users
UNION ALL
SELECT 'Admin Count' as check_type, COUNT(*) as count FROM users WHERE role = 'ADMIN';
