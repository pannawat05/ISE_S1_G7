/**
 * whitelist.controller.ts
 * Organizer สามารถเพิ่ม user เข้า white_list ของ event
 * ผู้ที่อยู่ใน whitelist เข้างานได้โดยตรง ไม่ต้องซื้อบัตร
 * (ไม่นับรวมกับ seat stats บน dashboard)
 */

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";

// ─── Guard: verify organizer ownership ───────────────────────────────────────
async function verifyOwner(req: AuthRequest, res: Response, organizerId: number) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return null; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return null; }
  return organizer;
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
      id: number;
      note: string | null;
      users_id: number;
      f_name: string;
      l_name: string;
      email: string;
      added_at: string;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id,
              u.f_name, u.l_name, u.email,
              wl.id AS added_at
       FROM white_list wl
       JOIN users u ON u.id = wl.users_id
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

    // Verify target user exists
    const userRows = await query<{ id: number; f_name: string; l_name: string; email: string }[]>(
      "SELECT id, f_name, l_name, email FROM users WHERE id = ? LIMIT 1",
      [users_id],
    );
    if (!userRows.length) return res.status(404).json({ message: "User not found" });

    // Add to whitelist (uq_white_list prevents duplicate)
    try {
      await execute(
        "INSERT INTO white_list (users_id, event_id, note, add_by) VALUES (?, ?, ?, ?)",
        [Number(users_id), eventId, note?.trim() ?? null, req.user.id],
      );
    } catch (dupErr: unknown) {
      const code = (dupErr as { code?: string }).code;
      if (code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "User นี้อยู่ใน whitelist แล้ว" });
      }
      throw dupErr;
    }

    // Return full updated list
    const rows = await query<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email
       FROM white_list wl JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.status(201).json({
      message: `เพิ่ม ${userRows[0].f_name} เข้า whitelist สำเร็จ`,
      whitelist: rows,
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

    const rows = await query<{ id: number }[]>(
      "SELECT id FROM white_list WHERE id = ? AND event_id = ? LIMIT 1",
      [wlId, eventId],
    );
    if (!rows.length) return res.status(404).json({ message: "Whitelist entry not found" });

    await execute("DELETE FROM white_list WHERE id = ?", [wlId]);

    const updated = await query<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email
       FROM white_list wl JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({ message: "ลบออกจาก whitelist แล้ว", whitelist: updated });
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
       ORDER BY f_name ASC
       LIMIT 15`,
      [`%${q}%`, `%${q}%`],
    );
    return res.json({ users });
  } catch (err) {
    console.error("SEARCH USERS ERROR:", err);
    return res.status(500).json({ message: "Error searching users" });
  }
}
