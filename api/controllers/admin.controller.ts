import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";
import { notifyEventApproved, notifyEventRejected } from "../lib/mailer.js";

// ─── List all events for admin review ────────────────────────────────────────
export async function listAllEvents(req: AuthRequest, res: Response) {
  const status = String(req.query.status ?? "").trim();
  const search = String(req.query.search ?? "").trim();

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) { conditions.push("e.status = ?"); params.push(status); }
    if (search) {
      conditions.push("(e.name LIKE ? OR o.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const events = await query<{
      id: number; name: string; description: string | null;
      cover_image: string; start_date: string; end_date: string;
      place_name: string; status: string; is_active: number;
      type_name: string; organizer_id: number; organizer_name: string;
      owner_id: number; owner_email: string; owner_name: string;
      created_at: string;
    }[]>(
      `SELECT e.id, e.name, e.description, e.cover_image,
              e.start_date, e.end_date, e.place_name,
              e.status, e.is_active, e.created_at,
              e.organizer_id,
              et.name AS type_name,
              o.name  AS organizer_name,
              u.id    AS owner_id,
              u.email AS owner_email,
              CONCAT(u.f_name,' ',u.l_name) AS owner_name
       FROM events e
       JOIN event_types et ON et.id  = e.type_id
       JOIN organizers  o  ON o.id   = e.organizer_id
       JOIN users       u  ON u.id   = o.owner_id
       ${where}
       ORDER BY e.created_at DESC`,
      params,
    );

    return res.json({ events });
  } catch (err) {
    console.error("ADMIN LIST EVENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}

// ─── Approve event ────────────────────────────────────────────────────────────
export async function approveEvent(req: AuthRequest, res: Response) {
  const eventId = Number(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

  try {
    await execute("UPDATE events SET status = 'approved', updated_at = NOW() WHERE id = ?", [eventId]);
    await notifyEventApproved(eventId);
    return res.json({ message: "Event approved" });
  } catch (err) {
    console.error("ADMIN APPROVE ERROR:", err);
    return res.status(500).json({ message: "Error approving event" });
  }
}

// ─── Reject event ─────────────────────────────────────────────────────────────
export async function rejectEvent(req: AuthRequest, res: Response) {
  const eventId = Number(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

  const note = String(req.body.note ?? "").trim();
  if (!note) return res.status(400).json({ message: "กรุณาระบุเหตุผลการ reject" });

  try {
    await execute("UPDATE events SET status = 'rejected', updated_at = NOW() WHERE id = ?", [eventId]);
    await notifyEventRejected(eventId, note);
    return res.json({ message: "Event rejected" });
  } catch (err) {
    console.error("ADMIN REJECT ERROR:", err);
    return res.status(500).json({ message: "Error rejecting event" });
  }
}

// ─── Get single event detail ──────────────────────────────────────────────────
export async function getEventDetail(req: AuthRequest, res: Response) {
  const eventId = Number(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

  try {
    const rows = await query<{
      id: number; name: string; description: string | null;
      cover_image: string; start_date: string; end_date: string;
      place_name: string; address: string | null;
      latitude: string; longitude: string;
      status: string; is_active: number; theme: string | null;
      type_name: string; organizer_name: string;
      owner_email: string; owner_name: string; created_at: string;
    }[]>(
      `SELECT e.id, e.name, e.description, e.cover_image,
              e.start_date, e.end_date, e.place_name, e.address,
              e.latitude, e.longitude, e.status, e.is_active,
              e.theme, e.created_at,
              et.name AS type_name,
              o.name  AS organizer_name,
              u.email AS owner_email,
              CONCAT(u.f_name,' ',u.l_name) AS owner_name
       FROM events e
       JOIN event_types et ON et.id  = e.type_id
       JOIN organizers  o  ON o.id   = e.organizer_id
       JOIN users       u  ON u.id   = o.owner_id
       WHERE e.id = ? LIMIT 1`,
      [eventId],
    );

    if (!rows[0]) return res.status(404).json({ message: "Event not found" });

    const images = await query<{ id: number; url: string; display_order: number }[]>(
      "SELECT id, url, display_order FROM event_images WHERE event_id = ? ORDER BY display_order ASC",
      [eventId],
    );

    return res.json({ event: { ...rows[0], images } });
  } catch (err) {
    console.error("ADMIN GET EVENT ERROR:", err);
    return res.status(500).json({ message: "Error fetching event" });
  }
}
