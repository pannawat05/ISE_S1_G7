-- Add whitelist_enabled only when missing; avoids relying on server-specific
-- support for ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
SET @whitelist_column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND COLUMN_NAME = 'whitelist_enabled'
);

SET @whitelist_column_migration = IF(
  @whitelist_column_exists = 0,
  'ALTER TABLE events ADD COLUMN whitelist_enabled BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT 1'
);

PREPARE whitelist_column_statement FROM @whitelist_column_migration;
EXECUTE whitelist_column_statement;
DEALLOCATE PREPARE whitelist_column_statement;
