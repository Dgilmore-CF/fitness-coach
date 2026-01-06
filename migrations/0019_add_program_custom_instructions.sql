-- Add custom_instructions column to programs table (if not exists)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- This migration may fail if column already exists, which is acceptable
-- The column was added to support custom AI instructions per program

-- Check if migration was already applied by trying to add column
-- If it fails with "duplicate column", that's fine - column exists
ALTER TABLE programs ADD COLUMN custom_instructions TEXT DEFAULT '';
