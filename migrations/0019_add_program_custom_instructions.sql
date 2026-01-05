-- Add custom_instructions column to programs table
ALTER TABLE programs ADD COLUMN custom_instructions TEXT DEFAULT '';
