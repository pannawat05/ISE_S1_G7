-- Migration: เพิ่ม 'deleted' ใน events.status ENUM
-- รันใน phpMyAdmin หรือ:
--   docker exec -i mysql_container mysql -uroot -psecretpassword mydatabase \
--     < migrations/add_deleted_status_to_events.sql

ALTER TABLE events
  MODIFY COLUMN status
    ENUM('pending','approved','rejected','deleted')
    NOT NULL DEFAULT 'pending';
