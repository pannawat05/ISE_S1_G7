/**
 * whitelist.controller.ts
 * Organizer เพิ่ม user เข้า white_list — สร้าง ticket พิเศษ (WL) ให้อัตโนมัติ
 *
 * Ticket WL flow:
 *   - หา zone แรกของ event (หรือ zone ที่ organizer กำหนด)
 *   - สร้าง virtual seat "WL-00" ใน zone นั้น (ถ้ายังไม่มี)
 *   - สร้าง ticket status = "paid" สำหรับ user นั้น + generate QR
 */

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

// ─── Guard ────────────────────────────────────────────────────────────────────
async function verifyOwner(req: AuthRequest, res: Response, organizerId: number) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return null; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return null; }
  return organizer;
}

// ─── Helper: get or create WL virtual seat ───────────────────────────────────
async function getOrCreateWLSeat(eventId: number): Promise<number> {
  // หา zone แรกของ event
  const zones = await query<{ id: number; name: string }[]>(
    "SELECT id, name FROM zones WHERE event_id = ? ORDER BY id ASC LIMIT 1",
    [eventId],
  );

  let zoneId: number;
  if (zones.length > 0) {
    zoneId = zones[0].id;
  } else {
    // Event ยังไม่มี zone — สร้าง whitelist zone พิเศษ
    const result = await execute(
      "INSERT INTO zones (event_id, name, category, type, price) VALUES (?, 'Whitelist', 'WL', 'ฟรี', 0)",
      [eventId],
    );
    zoneId = result.insertId;
  }

  // หา WL-00 seat ใน zone นั้น
  const existing = await query<{ id: number }[]>(
    "SELECT id FROM seats WHERE zone_id = ? AND position = 'WL-00' LIMIT 1",
    [zoneId],
  );
  if (existing[0]) return existing[0].id;

  // สร้าง virtual seat WL-00
  const result = await execute(
    "INSERT INTO seats (zone_id, name, position, is_active) VALUES (?, 'Whitelist', 'WL-00', 1)",
    [zoneId],
  );
  return result.insertId;
}

// ─── Helper: สร้าง WL ticket + generate QR ───────────────────────────────────
async function createWLTicket(userId: number, eventId: number): Promise<{
  ticket_id: number;
  qrcode: string;
  qr_data_url: string;
}> {
  const seatId = await getOrCreateWLSeat(eventId);
  const qrcode = `MT-WL-${uuidv4()}`;

  const result = await execute(
    "INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'paid', ?, ?)",
    [qrcode, userId, seatId],
  );
  const ticketId = result.insertId;

  // Fetch event/zone info for QR payload
  const rows = await query<{ event_name: string; zone_name: string }[]>(
    `SELECT e.name AS event_name, z.name AS zone_name
     FROM tickets t
     JOIN seats  s ON s.id = t.seat_id
     JOIN zones  z ON z.id = s.zone_id
     JOIN events e ON e.id = z.event_id
     WHERE t.id = ? LIMIT 1`,
    [ticketId],
  );
  const info = rows[0] ?? { event_name: "", zone_name: "Whitelist" };

  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      v: 1, id: ticketId, code: qrcode,
      seat: "WL-00", event: info.event_name, zone: info.zone_name,
      wl: true,
    }),
    { errorCorrectionLevel: "H", margin: 2, width: 300 },
  );

  return { ticket_id: ticketId, qrcode, qr_data_url: qrDataUrl };
}

// ─── GET /organizer/:id/events/:eventId/whitelist ─────────────────────────────
export async function listWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
      ticket_id: number | null; ticket_qrcode: string | null;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id,
              u.f_name, u.l_name, u.email,
              t.id AS ticket_id, t.qrcode AS ticket_qrcode
       FROM white_list wl
       JOIN users   u ON u.id = wl.users_id
       LEFT JOIN tickets t ON t.users_id = wl.users_id
         AND t.status = 'paid'
         AND EXISTS (
           SELECT 1 FROM seats s
           JOIN zones z ON z.id = s.zone_id
           WHERE s.id = t.seat_id AND z.event_id = wl.event_id AND s.position = 'WL-00'
         )
       WHERE wl.event_id = ?
       ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({ whitelist: rows });
  } catch (err) {
    console.error("LIST WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error fetching whitelist" });
  }
}

// ─── POST /organizer/:id/events/:eventId/whitelist ────────────────────────────
export async function addToWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const { users_id, note } = req.body as { users_id: number; note?: string };
  if (!users_id || isNaN(Number(users_id))) {
    return res.status(400).json({ message: "users_id is required" });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    // Verify event belongs to organizer
    const eventRows = await query<{ id: number }[]>(
      "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
      [eventId, organizerId],
    );
    if (!eventRows.length) return res.status(404).json({ message: "Event not found" });

    // Verify target user
    const userRows = await query<{ id: number; f_name: string; l_name: string; email: string }[]>(
      "SELECT id, f_name, l_name, email FROM users WHERE id = ? LIMIT 1",
      [users_id],
    );
    if (!userRows.length) return res.status(404).json({ message: "User not found" });

    // Add to whitelist
    try {
      await execute(
        "INSERT INTO white_list (users_id, event_id, note, add_by) VALUES (?, ?, ?, ?)",
        [Number(users_id), eventId, note?.trim() ?? null, req.user.id],
      );
    } catch (dupErr: unknown) {
      if ((dupErr as { code?: string }).code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "User นี้อยู่ใน whitelist แล้ว" });
      }
      throw dupErr;
    }

    // สร้าง WL ticket + QR
    const ticket = await createWLTicket(Number(users_id), eventId);

    // Return updated list
    const rows = await query<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
      ticket_id: number | null; ticket_qrcode: string | null;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email,
              t.id AS ticket_id, t.qrcode AS ticket_qrcode
       FROM white_list wl
       JOIN users u ON u.id = wl.users_id
       LEFT JOIN tickets t ON t.users_id = wl.users_id
         AND t.status = 'paid'
         AND EXISTS (
           SELECT 1 FROM seats s
           JOIN zones z ON z.id = s.zone_id
           WHERE s.id = t.seat_id AND z.event_id = wl.event_id AND s.position = 'WL-00'
         )
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.status(201).json({
      message: `เพิ่ม ${userRows[0].f_name} เข้า whitelist สำเร็จ`,
      whitelist: rows,
      ticket: {
        ticket_id: ticket.ticket_id,
        qrcode: ticket.qrcode,
        qr_data_url: ticket.qr_data_url,
      },
    });
  } catch (err) {
    console.error("ADD WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error adding to whitelist" });
  }
}

// ─── DELETE /organizer/:id/events/:eventId/whitelist/:wlId ───────────────────
export async function removeFromWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  const wlId        = Number(req.params.wlId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(wlId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<{ id: number; users_id: number }[]>(
      "SELECT id, users_id FROM white_list WHERE id = ? AND event_id = ? LIMIT 1",
      [wlId, eventId],
    );
    if (!rows.length) return res.status(404).json({ message: "Whitelist entry not found" });

    const { users_id } = rows[0];

    // ยกเลิก WL ticket ของ user นี้ในงานนี้
    await execute(
      `UPDATE tickets SET status = 'cancelled'
       WHERE users_id = ? AND status = 'paid'
       AND seat_id IN (
         SELECT s.id FROM seats s
         JOIN zones z ON z.id = s.zone_id
         WHERE z.event_id = ? AND s.position = 'WL-00'
       )`,
      [users_id, eventId],
    );

    await execute("DELETE FROM white_list WHERE id = ?", [wlId]);

    const updated = await query<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
      ticket_id: number | null; ticket_qrcode: string | null;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email,
              t.id AS ticket_id, t.qrcode AS ticket_qrcode
       FROM white_list wl
       JOIN users u ON u.id = wl.users_id
       LEFT JOIN tickets t ON t.users_id = wl.users_id
         AND t.status = 'paid'
         AND EXISTS (
           SELECT 1 FROM seats s
           JOIN zones z ON z.id = s.zone_id
           WHERE s.id = t.seat_id AND z.event_id = wl.event_id AND s.position = 'WL-00'
         )
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({ message: "ลบออกจาก whitelist แล้ว (ticket ถูกยกเลิก)", whitelist: updated });
  } catch (err) {
    console.error("REMOVE WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error removing from whitelist" });
  }
}

// ─── GET /organizer/:id/search-users?q= ──────────────────────────────────────
export async function searchUsers(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json({ users: [] });

  try {
    const users = await query<{ id: number; f_name: string; l_name: string; email: string }[]>(
      `SELECT id, f_name, l_name, email
       FROM users
       WHERE email LIKE ? OR CONCAT(f_name, ' ', l_name) LIKE ?
       ORDER BY f_name ASC LIMIT 15`,
      [`%${q}%`, `%${q}%`],
    );
    return res.json({ users });
  } catch (err) {
    console.error("SEARCH USERS ERROR:", err);
    return res.status(500).json({ message: "Error searching users" });
  }
}
