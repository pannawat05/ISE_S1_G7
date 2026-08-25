import type { Request, Response } from "express";
import { query } from "../model/query.js";
import type { EventImages, ListEvent, PublicEvent, PublicEventList, Total } from "../model/types.js";

// ─── Public zone/seat data for booking ───────────────────────────────────────
export async function listEventZones(req: Request, res: Response) {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

  try {
    // Verify event is approved & active
    const eventRows = await query<{ id: number }[]>(
      "SELECT id FROM events WHERE id = ? AND status = 'approved' AND is_active = 1 LIMIT 1",
      [eventId],
    );
    if (!eventRows.length) return res.status(404).json({ message: "Event not found" });

    // Zones with seat stats
    const zones = await query<{
      id: number; name: string; category: string; type: string; price: number;
      total_seats: number; available_seats: number;
    }[]>(
      `SELECT
         z.id, z.name, z.category, z.type, z.price,
         COUNT(s.id)                                                      AS total_seats,
         COUNT(CASE WHEN s.is_active = 1 AND t.id IS NULL THEN 1 END)   AS available_seats
       FROM zones z
       LEFT JOIN seats   s ON s.zone_id = z.id
       LEFT JOIN tickets t ON t.seat_id = s.id AND t.status NOT IN ('cancelled')
       WHERE z.event_id = ?
       GROUP BY z.id
       ORDER BY z.id ASC`,
      [eventId],
    );

    // Zone images
    if (zones.length) {
      const zoneIds = zones.map((z) => z.id);
      const images = await query<{ zone_id: number; id: number; url: string; name: string; display_order: number }[]>(
        `SELECT zone_id, id, url, name, display_order
         FROM zone_images
         WHERE zone_id IN (${zoneIds.map(() => "?").join(",")})
         ORDER BY zone_id, display_order ASC`,
        zoneIds,
      );

      // Attach images to zones
      const zonesWithImages = zones.map((z) => ({
        ...z,
        price: Number(z.price),
        total_seats: Number(z.total_seats),
        available_seats: Number(z.available_seats),
        images: images
          .filter((img) => img.zone_id === z.id)
          .map(({ zone_id: _z, ...img }) => img),
      }));

      return res.json({ zones: zonesWithImages });
    }

    return res.json({ zones: [] });
  } catch (err) {
    console.error("LIST EVENT ZONES ERROR:", err);
    return res.status(500).json({ message: "Error fetching zones" });
  }
}

// ─── Public seats for a specific zone ────────────────────────────────────────
export async function listZoneSeats(req: Request, res: Response) {
  const eventId = Number(req.params.id);
  const zoneId  = Number(req.params.zoneId);
  if (isNaN(eventId) || isNaN(zoneId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const seats = await query<{
      id: number; name: string; position: string;
      is_active: number; is_taken: number;
    }[]>(
      `SELECT
         s.id, s.name, s.position, s.is_active,
         CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END AS is_taken
       FROM seats s
       LEFT JOIN tickets t ON t.seat_id = s.id AND t.status NOT IN ('cancelled')
       WHERE s.zone_id = ?
       ORDER BY s.position ASC`,
      [zoneId],
    );

    return res.json({
      seats: seats.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        is_active: Boolean(s.is_active),
        is_available: Boolean(s.is_active) && !s.is_taken,
      })),
    });
  } catch (err) {
    console.error("LIST ZONE SEATS ERROR:", err);
    return res.status(500).json({ message: "Error fetching seats" });
  }
}

// Public — no auth required, used by organizer create-event form and home filter
export async function listEventTypes(_req: Request, res: Response) {
  try {
    const rows = await query<ListEvent[]>(
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
    const rows = await query<PublicEvent[]>(
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
    const images = await query<EventImages[]>(
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
  const sortBy   = String(req.query.sortBy   ?? "start_date").trim();

  // 📌 1. บังคับดัก check "DESC" ให้ชัวร์ 100%
  const reqOrder = String(req.query.order ?? "").trim().toUpperCase();
  const order    = reqOrder === "DESC" ? "DESC" : "ASC";

  // 1. ป้องกัน NaN บั๊กจาก query params
  const rawLimit  = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);
  const limit  = Math.min(isNaN(rawLimit) || rawLimit <= 0 ? 20 : rawLimit, 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

  // 📌 Console Log เพื่อดีบั๊กดูค่าจริงที่เข้ามา
  console.log(`[DEBUG QUERY] sortBy="${sortBy}" | parsedOrder="${order}" (raw="${req.query.order}")`);

  try {
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
      const typeList = type.split(",").map((t) => t.trim()).filter(Boolean);
      if (typeList.length === 1) {
        conditions.push("et.name = ?");
        params.push(typeList[0]);
      } else if (typeList.length > 1) {
        conditions.push(`et.name IN (${typeList.map(() => "?").join(",")})`);
        params.push(...typeList);
      }
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    // 📌 2. Map คอลัมน์สำหรับ ORDER BY ให้มี table prefix ชัดเจน
    const allowedSortFields: Record<string, string> = {
      name: "e.name",
      start_date: "e.start_date",
      end_date: "e.end_date",
    };
    
    const sortColumn = allowedSortFields[sortBy] || "e.start_date";

    // 📌 3. นำ sortColumn และ order ต่อกันโดยตรง
    const rows = await query<PublicEventList[]>(
      `SELECT e.id, e.name, e.place_name, e.address, e.description,
              e.cover_image, e.start_date, e.end_date,
              e.latitude, e.longitude,
              et.name AS type_name, o.name AS organizer_name
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       JOIN organizers o   ON o.id  = e.organizer_id
       ${where}
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRows = await query<Total[]>(
      `SELECT COUNT(*) AS total
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       JOIN organizers o   ON o.id  = e.organizer_id
       ${where}`,
      [...params]
    );

    return res.json({ 
      events: rows, 
      total: Number(countRows[0]?.total ?? 0) 
    });
  } catch (err) {
    console.error("PUBLIC EVENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}