-- Add created_at column safely
ALTER TABLE email_audit ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

-- Populate existing rows using sent_at (assuming sent_at is reliable)
UPDATE email_audit SET created_at = sent_at WHERE created_at IS NULL;

-- Set NOT NULL constraint
ALTER TABLE email_audit ALTER COLUMN created_at SET NOT NULL;
