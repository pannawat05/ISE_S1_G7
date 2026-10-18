ALTER TABLE events
  MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'deleted') NOT NULL DEFAULT 'pending';
