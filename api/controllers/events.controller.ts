import type { Request, Response } from "express";
import { query } from "../model/query.js";

// Public — no auth required, used by organizer create-event form and home filter
export async function listEventTypes(_req: Request, res: Response) {
  try {
    const rows = await query<{ id: number; name: string }[]>(
      "SELECT id, name FROM event_types ORDER BY name ASC",
    );
    return res.json({ event_types: rows });
  } catch (err) {
    console.error("LIST EVENT TYPES ERROR:", err);
    return res.status(500).json({ message: "Error fetching event types" });
  }
}

export async function getPublicEvent(req: Request, res: Response) {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

  try {
    const rows = await query<{
      id: number; name: string; place_name: string; address: string | null;
      description: string | null; cover_image: string;
      start_date: string; end_date: string;
      type_name: string; organizer_name: string;
      organizer_logo: string | null;
      latitude: string; longitude: string;
      theme: string | null;
    }[]>(
      `SELECT e.id, e.name, e.place_name, e.address, e.description,
              e.cover_image, e.start_date, e.end_date,
              e.latitude, e.longitude, e.theme,
              et.name AS type_name,
              o.name  AS organizer_name,
              o.logo_url AS organizer_logo
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       JOIN organizers  o  ON o.id  = e.organizer_id
       WHERE e.id = ? AND e.status = 'approved' AND e.is_active = 1`,
      [eventId],
    );

    if (!rows.length) return res.status(404).json({ message: "Event not found" });

    // Fetch extra images
    const images = await query<{ id: number; url: string; display_order: number }[]>(
      "SELECT id, url, display_order FROM event_images WHERE event_id = ? ORDER BY display_order ASC",
      [eventId],
    );

    return res.json({ event: { ...rows[0], images } });
  } catch (err) {
    console.error("GET PUBLIC EVENT ERROR:", err);
    return res.status(500).json({ message: "Error fetching event" });
  }
}

export async function listPublicEvents(req: Request, res: Response) {
  const search   = String(req.query.search   ?? "").trim();
  const location = String(req.query.location ?? "").trim();
  const type     = String(req.query.type     ?? "").trim();
  const limit    = Math.min(Number(req.query.limit  ?? 20), 100);
  const offset   = Math.max(Number(req.query.offset ?? 0),  0);

  try {
    // Show only approved and active events for public
    const conditions: string[] = ["e.status = 'approved'", "e.is_active = 1"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(e.name LIKE ? OR o.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (location) {
      conditions.push("(e.place_name LIKE ? OR e.address LIKE ?)");
      params.push(`%${location}%`, `%${location}%`);
    }
    if (type) {
      conditions.push("et.name = ?");
      params.push(type);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const rows = await query<{
      id: number; name: string; place_name: string; address: string | null;
      description: string | null; cover_image: string;
      start_date: string; end_date: string;
      type_name: string; organizer_name: string;
      latitude: string; longitude: string;
    }[]>(
      `SELECT e.id, e.name, e.place_name, e.address, e.description,
              e.cover_image, e.start_date, e.end_date,
              e.latitude, e.longitude,
              et.name AS type_name, o.name AS organizer_name
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       JOIN organizers o   ON o.id  = e.organizer_id
       ${where}
       ORDER BY e.start_date ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const countRows = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       JOIN organizers o   ON o.id  = e.organizer_id
       ${where}`,
      params,
    );

    return res.json({ events: rows, total: countRows[0]?.total ?? 0 });
  } catch (err) {
    console.error("PUBLIC EVENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}