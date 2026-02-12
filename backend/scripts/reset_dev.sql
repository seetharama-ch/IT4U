TRUNCATE TABLE attachments, comments, email_audit, tickets RESTART IDENTITY CASCADE;
DELETE FROM users WHERE username <> 'admin';
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 2;
