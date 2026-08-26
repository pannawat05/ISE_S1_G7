-- Migration: สร้างตาราง event_documents
-- รันใน phpMyAdmin หรือ:
--   docker exec -i mysql_container mysql -uroot -psecretpassword mydatabase \
--     < migrations/create_event_documents.sql

CREATE TABLE IF NOT EXISTS event_documents (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    event_id     INT          NOT NULL,
    name         VARCHAR(255) NOT NULL,       -- ชื่อไฟล์ที่แสดง
    file_url     VARCHAR(500) NOT NULL,       -- path ใน server
    file_type    VARCHAR(100) NOT NULL,       -- MIME type
    file_size    INT          NOT NULL,       -- bytes
    uploaded_by  INT          NOT NULL,       -- users.id
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evdoc_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evdoc_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
);
