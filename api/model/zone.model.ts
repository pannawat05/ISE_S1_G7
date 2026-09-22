import { query, execute } from "./query.js";

export interface ZoneRow {
  id: number;
  name: string;
  category: string;
  type: string;
  price: number;
  event_id: number;
  seat_count: number;
  images: ZoneImageRow[];
}

export interface ZoneImageRow {
  id: number;
  url: string;
  name: string;
  display_order: number;
}

export interface RowConfig {
  label: string;
  count: number;
}

// ─── List zones for an event (with seat count + images) ───────────────────────
export async function listZonesByEvent(eventId: number): Promise<ZoneRow[]> {
  const zones = await query<(Omit<ZoneRow, "images" | "seat_count"> & { seat_count: number })[]>(
    `SELECT z.id, z.name, z.category, z.type, z.price, z.event_id,
            COUNT(s.id) AS seat_count
     FROM zones z
     LEFT JOIN seats s ON s.zone_id = z.id
     WHERE z.event_id = ?
     GROUP BY z.id
     ORDER BY z.id ASC`,
    [eventId],
  );
  if (!zones.length) return [];

  const zoneIds = zones.map((z) => z.id);
  const images = await query<(ZoneImageRow & { zone_id: number })[]>(
    `SELECT id, url, name, display_order, zone_id
     FROM zone_images
     WHERE zone_id IN (${zoneIds.map(() => "?").join(",")})
     ORDER BY zone_id, display_order ASC`,
    zoneIds,
  );

  return zones.map((z) => ({
    ...z,
    price: Number(z.price),
    seat_count: Number(z.seat_count),
    images: images.filter((img) => img.zone_id === z.id),
  }));
}

export async function createZone(data: {
  event_id: number;
  name: string;
  category: string;
  type: string;
  price: number;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO zones (event_id, name, category, type, price) VALUES (?, ?, ?, ?, ?)",
    [data.event_id, data.name, data.category, data.type, data.price],
  );
  return result.insertId;
}

export async function updateZone(
  zoneId: number,
  data: { name?: string; category?: string; type?: string; price?: number },
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined)     { fields.push("name = ?");     values.push(data.name); }
  if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category); }
  if (data.type !== undefined)     { fields.push("type = ?");     values.push(data.type); }
  if (data.price !== undefined)    { fields.push("price = ?");    values.push(data.price); }
  if (!fields.length) return;
  values.push(zoneId);
  await execute(`UPDATE zones SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteZone(zoneId: number): Promise<void> {
  await execute("DELETE FROM zones WHERE id = ?", [zoneId]);
}

export async function findZoneById(zoneId: number): Promise<{ id: number; event_id: number } | null> {
  const rows = await query<{ id: number; event_id: number }[]>(
    "SELECT id, event_id FROM zones WHERE id = ?",
    [zoneId],
  );
  return rows[0] ?? null;
}

// ─── Zone Images ──────────────────────────────────────────────────────────────

export async function insertZoneImage(
  zoneId: number, url: string, name: string, displayOrder: number,
): Promise<number> {
  const result = await execute(
    "INSERT INTO zone_images (zone_id, url, name, display_order) VALUES (?, ?, ?, ?)",
    [zoneId, url, name, displayOrder],
  );
  return result.insertId;
}

export async function deleteZoneImage(imageId: number): Promise<void> {
  await execute("DELETE FROM zone_images WHERE id = ?", [imageId]);
}

export async function getMaxZoneImageOrder(zoneId: number): Promise<number> {
  const rows = await query<{ max_order: number | null }[]>(
    "SELECT MAX(display_order) AS max_order FROM zone_images WHERE zone_id = ?",
    [zoneId],
  );
  return rows[0]?.max_order ?? 0;
}

// ─── Seats ────────────────────────────────────────────────────────────────────

export async function countSeats(zoneId: number): Promise<number> {
  const rows = await query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM seats WHERE zone_id = ?",
    [zoneId],
  );
  return rows[0]?.total ?? 0;
}

export async function countSeatsByEvent(eventId: number): Promise<Record<number, number>> {
  const rows = await query<{ zone_id: number; total: number }[]>(
    `SELECT z.id AS zone_id, COUNT(s.id) AS total
     FROM zones z
     LEFT JOIN seats s ON s.zone_id = z.id
     WHERE z.event_id = ?
     GROUP BY z.id`,
    [eventId],
  );
  const map: Record<number, number> = {};
  for (const r of rows) map[r.zone_id] = Number(r.total);
  return map;
}

// ─── setRowSeats: row-based seat config ──────────────────────────────────────
/**
 * กำหนดที่นั่งตาม row config
 * position format: {label}{number} เช่น A1, A2, VIP-L1, FLOOR3
 * ลบเฉพาะที่นั่งที่ไม่มี ticket linked (safe delete)
 */
export async function setRowSeats(zoneId: number, rows: RowConfig[]): Promise<void> {
  // Build target positions
  const target = new Map<string, string>(); // position → label
  for (const row of rows) {
    const label = row.label.trim();
    if (!label || row.count <= 0) continue;
    for (let i = 1; i <= row.count; i++) {
      target.set(`${label}${i}`, label);
    }
  }

  // Fetch existing
  const existing = await query<{ id: number; position: string }[]>(
    "SELECT id, position FROM seats WHERE zone_id = ?",
    [zoneId],
  );
  const existingMap = new Map(existing.map((s) => [s.position, s.id]));

  // Delete seats not in target (only if no ticket)
  for (const { id, position } of existing) {
    if (!target.has(position)) {
      await execute(
        `DELETE FROM seats WHERE id = ?
         AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.seat_id = ?)`,
        [id, id],
      );
    }
  }

  // Insert new seats
  for (const [position] of target.entries()) {
    if (!existingMap.has(position)) {
      await execute(
        "INSERT INTO seats (zone_id, name, position, is_active) VALUES (?, ?, ?, 1)",
        [zoneId, position, position],
      );
    }
  }
}

// ─── listRowsByZone ───────────────────────────────────────────────────────────
export async function listRowsByZone(zoneId: number): Promise<RowConfig[]> {
  const seats = await query<{ position: string }[]>(
    "SELECT position FROM seats WHERE zone_id = ? ORDER BY position ASC",
    [zoneId],
  );

  // Derive label from position string (strip trailing digits)
  const rowMap = new Map<string, number>();
  for (const { position } of seats) {
    const label = position.replace(/\d+$/, "") || position;
    rowMap.set(label, (rowMap.get(label) ?? 0) + 1);
  }

  return Array.from(rowMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

// ─── setSeatCount (legacy flat count) ────────────────────────────────────────
export async function setSeatCount(zoneId: number, targetCount: number): Promise<void> {
  const current = await countSeats(zoneId);
  if (targetCount === current) return;

  if (targetCount > current) {
    const toAdd = targetCount - current;
    const existing = await query<{ position: string }[]>(
      "SELECT position FROM seats WHERE zone_id = ? ORDER BY id ASC",
      [zoneId],
    );
    const used = new Set(existing.map((s) => s.position));
    let added = 0, row = 0, col = 1;
    while (added < toAdd) {
      const position = `${rowLabel(row)}${col}`;
      if (!used.has(position)) {
        await execute(
          "INSERT INTO seats (zone_id, name, position, is_active) VALUES (?, ?, ?, 1)",
          [zoneId, position, position],
        );
        added++;
      }
      col++;
      if (col > 50) { col = 1; row++; }
    }
  } else {
    const toRemove = current - targetCount;
    const seats = await query<{ id: number }[]>(
      `SELECT s.id FROM seats s
       LEFT JOIN tickets t ON t.seat_id = s.id
       WHERE s.zone_id = ? AND t.id IS NULL
       ORDER BY s.id DESC LIMIT ?`,
      [zoneId, toRemove],
    );
    for (const seat of seats) {
      await execute("DELETE FROM seats WHERE id = ?", [seat.id]);
    }
  }
}

function rowLabel(index: number): string {
  let label = "";
  do {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return label;
}
