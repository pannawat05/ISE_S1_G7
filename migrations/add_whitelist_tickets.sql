-- Allow whitelist tickets without consuming a seat and backfill existing whitelist entries.
ALTER TABLE tickets
  ADD COLUMN event_id INT NULL AFTER seat_id,
  ADD COLUMN ticket_type ENUM('purchase', 'whitelist') NOT NULL DEFAULT 'purchase' AFTER event_id;

UPDATE tickets t
JOIN seats s ON s.id = t.seat_id
JOIN zones z ON z.id = s.zone_id
SET t.event_id = z.event_id;

ALTER TABLE tickets
  MODIFY seat_id INT NULL,
  MODIFY event_id INT NOT NULL,
  ADD CONSTRAINT fk_ticket_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

INSERT INTO tickets (qrcode, status, users_id, seat_id, event_id, ticket_type, gross_amount, net_amount)
SELECT CONCAT('MT-WL-', UUID()), 'paid', wl.users_id, NULL, wl.event_id, 'whitelist', 0, 0
FROM white_list wl
WHERE NOT EXISTS (
  SELECT 1
  FROM tickets t
  WHERE t.users_id = wl.users_id
    AND t.event_id = wl.event_id
    AND t.ticket_type = 'whitelist'
);
