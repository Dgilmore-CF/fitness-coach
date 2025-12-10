-- Add description field to programs table
ALTER TABLE programs ADD COLUMN description TEXT;

-- Create index for searching descriptions
CREATE INDEX IF NOT EXISTS idx_programs_description ON programs(description);
