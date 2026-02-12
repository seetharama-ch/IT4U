-- Add updated_at column safely
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Add updated_by_id column safely
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_by_id BIGINT;

-- Add foreign key constraint safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_updated_by') THEN
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id);
    END IF;
END $$;

-- Backfill updated_at with created_at for existing records
UPDATE tickets SET updated_at = created_at WHERE updated_at IS NULL;
