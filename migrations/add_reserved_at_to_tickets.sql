ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS reserved_at DATETIME NULL DEFAULT NULL;

-- Backfill existing reserved tickets with created_at or NOW() so they expire correctly
UPDATE tickets
SET reserved_at = NOW()
WHERE status = 'reserved' AND reserved_at IS NULL;
