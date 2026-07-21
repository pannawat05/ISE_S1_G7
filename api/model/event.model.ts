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
     WHERE e.organizer_id = ?
     ORDER BY e.start_date DESC`,
    [organizerId],
  );
}
