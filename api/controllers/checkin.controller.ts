/**
 * checkin.controller.ts
 * Staff สแกน QR Code เพื่อ check-in ticket
 *
 * POST /checkin/scan
 *   body: { qrcode: string, event_id: number }
 *   - verify ticket belongs to the event
 *   - verify ticket status = 'paid'
 *   - verify scanner is staff of the event (or organizer owner)
 *   - UPDATE tickets SET status = 'checked_in'
 *   - return ticket info
 */

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";

// ─── POST /checkin/scan ───────────────────────────────────────────────────────
export async function scanTicket(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { qrcode, event_id } = req.body as { qrcode: string; event_id: number };
  if (!qrcode?.trim()) return res.status(400).json({ message: "qrcode is required" });
  if (!event_id || isNaN(Number(event_id))) return res.status(400).json({ message: "event_id is required" });

  try {
    // 1. Verify scanner has permission (staff of event OR organizer owner)
    const permRows = await query<{ count: number }[]>(
      `SELECT COUNT(*) AS count
       FROM (
         -- is event staff
         SELECT 1 FROM event_staff es
         JOIN staff s ON s.id = es.staff_id
         WHERE es.event_id = ? AND s.users_id = ?
         UNION ALL
         -- is organizer owner
         SELECT 1 FROM events e
         JOIN organizers o ON o.id = e.organizer_id
         WHERE e.id = ? AND o.owner_id = ?
       ) AS perms`,
      [Number(event_id), userId, Number(event_id), userId],
    );

    if (!permRows[0] || permRows[0].count === 0) {
      return res.status(403).json({
        status: "forbidden",
        message: "คุณไม่มีสิทธิ์ตรวจบัตรในงานนี้",
      });
    }

    // 2. Find ticket by QR code
    const tickets = await query<{
      id: number;
      status: string;
      users_id: number;
      seat_position: string;
      zone_name: string;
      event_id: number;
      event_name: string;
      holder_name: string;
      holder_email: string;
      is_wl: number;
    }[]>(
      `SELECT
         t.id, t.status, t.users_id,
         s.position AS seat_position,
         z.name     AS zone_name,
         e.id       AS event_id,
         e.name     AS event_name,
         CONCAT(u.f_name,' ',u.l_name) AS holder_name,
         u.email    AS holder_email,
         CASE WHEN s.position = 'WL-00' THEN 1 ELSE 0 END AS is_wl
       FROM tickets t
       JOIN seats    s ON s.id  = t.seat_id
       JOIN zones    z ON z.id  = s.zone_id
       JOIN events   e ON e.id  = z.event_id
       JOIN users    u ON u.id  = t.users_id
       WHERE t.qrcode = ? LIMIT 1`,
      [qrcode.trim()],
    );

    if (!tickets.length) {
      return res.status(404).json({
        status: "invalid",
        message: "ไม่พบบัตรนี้ในระบบ",
      });
    }

    const ticket = tickets[0];

    // 3. Verify ticket belongs to this event
    if (ticket.event_id !== Number(event_id)) {
      return res.status(422).json({
        status: "wrong_event",
        message: `บัตรนี้เป็นของงาน "${ticket.event_name}" ไม่ใช่งานที่กำลังตรวจอยู่`,
        ticket_event: ticket.event_name,
      });
    }

    // 4. Check ticket status
    if (ticket.status === "checked_in") {
      return res.status(409).json({
        status: "already_checked_in",
        message: "บัตรนี้ถูก check-in ไปแล้ว",
        holder: ticket.holder_name,
        seat: ticket.seat_position,
        zone: ticket.zone_name,
        is_wl: Boolean(ticket.is_wl),
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(410).json({
        status: "cancelled",
        message: "บัตรนี้ถูกยกเลิกแล้ว",
      });
    }

    if (ticket.status === "reserved") {
      return res.status(402).json({
        status: "not_paid",
        message: "บัตรนี้ยังไม่ได้ชำระเงิน",
      });
    }

    if (ticket.status !== "paid") {
      return res.status(422).json({
        status: "invalid_status",
        message: `สถานะบัตรไม่ถูกต้อง: ${ticket.status}`,
      });
    }

    // 5. ✅ Check-in
    await execute(
      "UPDATE tickets SET status = 'checked_in' WHERE id = ?",
      [ticket.id],
    );

    return res.json({
      status: "ok",
      message: "✅ Check-in สำเร็จ!",
      holder: ticket.holder_name,
      holder_email: ticket.holder_email,
      seat: ticket.seat_position,
      zone: ticket.zone_name,
      ticket_id: ticket.id,
      is_wl: Boolean(ticket.is_wl),
    });
  } catch (err) {
    console.error("SCAN TICKET ERROR:", err);
    return res.status(500).json({ message: "Error scanning ticket" });
  }
}
