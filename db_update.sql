-- Add missing columns to users table

-- auth_provider
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL';

-- last_login_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- full_name
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- created_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Ensure role exists and has default 'EMPLOYEE'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'EMPLOYEE';

-- Backfill existing rows (safety measure, though defaults should handle new columns)
UPDATE users SET auth_provider = 'LOCAL' WHERE auth_provider IS NULL;
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
UPDATE users SET role = 'EMPLOYEE' WHERE role IS NULL;
