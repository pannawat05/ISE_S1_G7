-- Migration: แก้ FK constraint ของ white_list.add_by
-- จาก staff.id → users.id เพื่อให้ organizer owner เพิ่ม whitelist ได้
--
-- รันใน phpMyAdmin หรือ MySQL shell:
--   USE mydatabase;
--   SOURCE /path/to/fix_whitelist_add_by.sql;

ALTER TABLE white_list
  DROP FOREIGN KEY fk_wl_staff;

ALTER TABLE white_list
  ADD CONSTRAINT fk_wl_added_by
    FOREIGN KEY (add_by)
    REFERENCES users(id);

ALTER TABLE events 
  MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'deleted') 
  NOT NULL DEFAULT 'pending';