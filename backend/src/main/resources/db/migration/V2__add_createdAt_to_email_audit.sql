-- 1) Add column as nullable first (safe for existing rows)
ALTER TABLE email_audit
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

-- 2) Backfill existing rows that have NULL created_at
UPDATE email_audit
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;

-- 3) Set default for future inserts
ALTER TABLE email_audit
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- 4) Enforce NOT NULL now that old rows are backfilled
ALTER TABLE email_audit
ALTER COLUMN created_at SET NOT NULL;
