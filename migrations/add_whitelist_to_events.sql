-- Add whitelist_enabled column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN DEFAULT FALSE;
