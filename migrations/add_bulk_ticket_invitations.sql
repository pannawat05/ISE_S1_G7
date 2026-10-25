CREATE TABLE IF NOT EXISTS bulk_ticket_batches (
  id CHAR(36) PRIMARY KEY,
  event_id INT NOT NULL,
  created_by INT NOT NULL,
  group_email VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bulk_batch_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_batch_user FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bulk_ticket_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id CHAR(36) NOT NULL,
  event_id INT NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  status ENUM('issued', 'paid', 'cancelled') NOT NULL DEFAULT 'issued',
  invitation_email_status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  invitation_email_error VARCHAR(500) NULL,
  ticket_email_status ENUM('pending', 'sent', 'failed') NULL DEFAULT NULL,
  ticket_email_error VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_bulk_invitation_event_email UNIQUE (event_id, invited_email),
  CONSTRAINT fk_bulk_invitation_batch FOREIGN KEY (batch_id)
    REFERENCES bulk_ticket_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_invitation_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE
);

SET @bulk_ticket_invitation_column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tickets'
    AND COLUMN_NAME = 'bulk_invitation_id'
);

SET @bulk_ticket_invitation_column_migration = IF(
  @bulk_ticket_invitation_column_exists = 0,
  'ALTER TABLE tickets ADD COLUMN bulk_invitation_id INT NULL UNIQUE, ADD CONSTRAINT fk_ticket_bulk_invitation FOREIGN KEY (bulk_invitation_id) REFERENCES bulk_ticket_invitations(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE bulk_ticket_invitation_statement FROM @bulk_ticket_invitation_column_migration;
EXECUTE bulk_ticket_invitation_statement;
DEALLOCATE PREPARE bulk_ticket_invitation_statement;
