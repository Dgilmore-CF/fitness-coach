-- Add gender field to users table
ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'not_specified' CHECK(gender IN ('male', 'female', 'not_specified'));

-- Add index for potential future queries
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
