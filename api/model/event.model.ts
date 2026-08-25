import type { CreateEventInput, EventRow, EventTypeRow } from "./types.js";
import { execute, query } from "./query.js";

export async function findOrCreateEventType(name: string): Promise<number> {
  const existing = await query<EventTypeRow[]>(
    "SELECT id FROM event_types WHERE name = ? LIMIT 1",
    [name],
  );

  if (existing[0]) {
    return existing[0].id;
  }

  const result = await execute(
    "INSERT INTO event_types (name) VALUES (?)",
    [name],
  );
  return result.insertId;
}

export async function createEvent(input: CreateEventInput): Promise<number> {
  const result = await execute(
    `INSERT INTO events (
      name, place_name, address, latitude, longitude, cover_image,
      description, theme, status, is_active, start_date, end_date,
      organizer_id, type_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.place_name,
      input.address ?? null,
      input.latitude ?? 0,
      input.longitude ?? 0,
      input.cover_image ?? "",
      input.description ?? null,
      input.theme ?? null,
      input.status ?? "pending",
      input.is_active ?? true,
      input.start_date,
      input.end_date,
      input.organizer_id,
      input.type_id,
    ],
  );
  return result.insertId;
}

export async function findEventsByOrganizerId(
  organizerId: number,
): Promise<EventRow[]> {
  return query<EventRow[]>(
    `SELECT e.*, et.name AS type_name
     FROM events e
     JOIN event_types et ON et.id = e.type_id
     WHERE e.organizer_id = ? AND e.status != 'deleted'
     ORDER BY e.start_date DESC`,
    [organizerId],
  );
}

export async function findEventById(
  eventId: number,
): Promise<(EventRow & { type_name: string; images: { id: number; url: string; display_order: number }[] }) | null> {
  const rows = await query<(EventRow & { type_name: string })[]>(
    `SELECT e.*, et.name AS type_name
     FROM events e
     JOIN event_types et ON et.id = e.type_id
     WHERE e.id = ? LIMIT 1`,
    [eventId],
  );
  if (!rows[0]) return null;

  const images = await query<{ id: number; url: string; display_order: number }[]>(
    `SELECT id, url, display_order FROM event_images WHERE event_id = ? ORDER BY display_order ASC`,
    [eventId],
  );

  return { ...rows[0], images };
}

export async function updateEvent(
  eventId: number,
  fields: Partial<Omit<CreateEventInput, "organizer_id" | "type_id">> & { type_id?: number },
): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const setClauses = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  await execute(
    `UPDATE events SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
    [...values, eventId],
  );
}

export async function insertEventImage(
  eventId: number,
  url: string,
  displayOrder: number,
): Promise<number> {
  const result = await execute(
    "INSERT INTO event_images (event_id, name, url, display_order) VALUES (?, ?, ?, ?)",
    [eventId, url.split("/").pop() ?? "image", url, displayOrder],
  );
  return result.insertId;
}

export async function deleteEventImage(imageId: number): Promise<void> {
  await execute("DELETE FROM event_images WHERE id = ?", [imageId]);
}

export async function getMaxDisplayOrder(eventId: number): Promise<number> {
  const rows = await query<{ max_order: number | null }[]>(
    "SELECT MAX(display_order) AS max_order FROM event_images WHERE event_id = ?",
    [eventId],
  );
  return rows[0]?.max_order ?? 0;
}

export async function updateEventImageOrder(
  imageId: number,
  displayOrder: number,
): Promise<void> {
  await execute(
    "UPDATE event_images SET display_order = ? WHERE id = ?",
    [displayOrder, imageId],
  );
}
