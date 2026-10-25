import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import {
  createEvent,
  findEventsByOrganizerId,
  findEventById,
  updateEvent,
  findOrCreateEventType,
  insertEventImage,
  deleteEventImage,
  getMaxDisplayOrder,
  updateEventImageOrder,
  findEventByNameAndOrganizer,
} from "../model/event.model.js";
import {
  createOrganizer,
  findOrganizerById,
  updateOrganizer,
  deleteOrganizer,
  findOrganizerByName,
} from "../model/organizer.model.js";
import {
  listZonesByEvent,
  createZone,
  updateZone,
  deleteZone,
  findZoneById,
  insertZoneImage,
  deleteZoneImage,
  getMaxZoneImageOrder,
  setSeatCount,
  countSeats,
} from "../model/zone.model.js";
import { query } from "../model/query.js";

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20"
});

async function getPlatformFeePercent(): Promise<number> {
  try {
    const rows = await query<{ setting_value: number }[]>(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'platform_fee_percent' LIMIT 1",
    );
    const value = Number(rows[0]?.setting_value);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 10;
  } catch {
    return 10;
  }
}

/** Verify that the authenticated user owns the organizer. Returns organizer or sends error. */
async function resolveOrganizerOwner(
  req: AuthRequest,
  res: Response,
  organizerId: number,
) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return null; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return null; }
  return organizer;
}

type MulterFiles = Record<string, Express.Multer.File[]>;

function getFiles(req: AuthRequest): MulterFiles {
  return (req as AuthRequest & { files?: MulterFiles }).files ?? {};
}

function getSingleFile(req: AuthRequest): Express.Multer.File | undefined {
  return (req as AuthRequest & { file?: Express.Multer.File }).file;
}

// ─── Organizer CRUD ───────────────────────────────────────────────────────────

export async function createOrganizerHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { name, description } = req.body;
  const logoFile = getSingleFile(req);

  if (!name?.trim()) return res.status(400).json({ message: "ชื่อ Organizer is required" });

  try {
    const isDuplicate = await findOrganizerByName(name.trim());
    if (isDuplicate) {
      return res.status(409).json({ message: `ชื่อ Organizer "${name.trim()}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` });
    }

    const logoUrl = logoFile ? `/uploads/organizer/logo/${logoFile.filename}` : "";
    const organizerId = await createOrganizer(name.trim(), logoUrl, description ?? "", userId);
    return res.status(201).json({
      message: "Organizer created successfully",
      organizerId,
      name: name.trim(),
      logo_url: logoUrl || null,
    });
  } catch (err) {
    console.error("CREATE ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error creating organizer" });
  }
}

export async function getOrganizer(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });
    return res.json({
      id: organizer.id,
      name: organizer.name,
      logo_url: organizer.logo_url,
      description: organizer.description ?? null,
      owner_id: organizer.owner_id,
      stripe_account_id: organizer.stripe_id || null,
      created_at: organizer.created_at,
      updated_at: organizer.updated_at,
    });
  } catch (err) {
    console.error("GET ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error fetching organizer" });
  }
}

export async function updateOrganizerHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  const { name, description } = req.body;
  const logoFile = getSingleFile(req);

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const updates: { name?: string; logo_url?: string; description?: string } = {};
    if (name?.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (logoFile) updates.logo_url = `/uploads/organizer/logo/${logoFile.filename}`;

    if (name?.trim()) {
      const isDuplicate = await findOrganizerByName(name.trim(), organizerId);
      if (isDuplicate) {
        return res.status(409).json({ message: `ชื่อ Organizer "${name.trim()}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` });
      }
    }

    await updateOrganizer(organizerId, updates);
    const updated = await findOrganizerById(organizerId);

    return res.json({
      message: "Organizer updated successfully",
      organizer: {
        id: updated!.id,
        name: updated!.name,
        logo_url: updated!.logo_url,
        description: updated!.description ?? null,
      },
    });
  } catch (err) {
    console.error("UPDATE ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error updating organizer" });
  }
}

export async function deleteOrganizerHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;
    await deleteOrganizer(organizerId);
    return res.json({ message: "Organizer deleted successfully" });
  } catch (err) {
    console.error("DELETE ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error deleting organizer" });
  }
}

// ─── Event CRUD (scoped to organizer) ────────────────────────────────────────

export async function listEventsByOrganizer(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;
    const events = await findEventsByOrganizerId(organizerId);
    return res.json({ events });
  } catch (err) {
    console.error("LIST EVENTS BY ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}

export async function createEventForOrganizer(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  const {
    name, place_name, address, latitude, longitude,
    description, theme, type, type_id, start_date, end_date, is_active, whitelist_enabled,
  } = req.body;

  if (!name?.trim() || !place_name?.trim() || !start_date || !end_date) {
    return res.status(400).json({ message: "name, place_name, start_date, end_date are required" });
  }

  const resolvedTypeId = type_id ? Number(type_id) : null;
  if (!resolvedTypeId && !type?.trim()) {
    return res.status(400).json({ message: "type_id or type is required" });
  }

  const files = getFiles(req);
  const coverFile = files["cover_image"]?.[0];
  const coverImageUrl = coverFile ? `/uploads/event/${coverFile.filename}` : "";

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const isDuplicate = await findEventByNameAndOrganizer(name.trim(), organizerId);
    if (isDuplicate) {
      return res.status(409).json({ message: `ชื่อ Event "${name.trim()}" มีอยู่ใน Organizer นี้แล้ว กรุณาใช้ชื่ออื่น` });
    }

    const finalTypeId = resolvedTypeId ?? (await findOrCreateEventType(type));
    const eventId = await createEvent({
      name: name.trim(),
      place_name: place_name.trim(),
      address: address ?? null,
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      cover_image: coverImageUrl,
      description: description ?? null,
      theme: theme ?? null,
      status: "pending",
      is_active: is_active !== false,
      whitelist_enabled: whitelist_enabled === true || whitelist_enabled === "true" || whitelist_enabled === "1",
      start_date,
      end_date,
      organizer_id: organizerId,
      type_id: finalTypeId,
    });

    const extraImages = files["event_images"] ?? [];
    for (let i = 0; i < extraImages.length; i++) {
      await insertEventImage(eventId, `/uploads/event/${extraImages[i]?.filename}`, i + 1);
    }

    return res.status(201).json({
      message: "Event created successfully",
      eventId,
      cover_image: coverImageUrl || null,
    });
  } catch (err) {
    console.error("CREATE EVENT FOR ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error creating event" });
  }
}

export async function getEventById(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;
    const event = await findEventById(eventId);
    if (!event || event.organizer_id !== organizerId) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json({ event });
  } catch (err) {
    console.error("GET EVENT ERROR:", err);
    return res.status(500).json({ message: "Error fetching event" });
  }
}

export async function updateEventHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const {
    name, place_name, address, latitude, longitude,
    description, theme, type, start_date, end_date, is_active, whitelist_enabled,
  } = req.body;
  const files = getFiles(req);
  const coverFile = files["cover_image"]?.[0];

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const existing = await findEventById(eventId);
    if (!existing || existing.organizer_id !== organizerId) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updates: Record<string, unknown> = {};
    if (name?.trim())              updates.name        = name.trim();
    if (place_name?.trim())        updates.place_name  = place_name.trim();
    if (address !== undefined)     updates.address     = address ?? null;
    if (latitude !== undefined)    updates.latitude    = Number(latitude);
    if (longitude !== undefined)   updates.longitude   = Number(longitude);
    if (description !== undefined) updates.description = description ?? null;
    if (theme !== undefined)       updates.theme       = theme ?? null;
    if (whitelist_enabled !== undefined) {
      updates.whitelist_enabled =
        whitelist_enabled === true || whitelist_enabled === "true" || whitelist_enabled === "1";
    }
    if (start_date)                updates.start_date  = start_date;
    if (end_date)                  updates.end_date    = end_date;
    if (is_active !== undefined)   updates.is_active   = is_active !== false && is_active !== "false";
    if (coverFile)                 updates.cover_image = `/uploads/event/${coverFile.filename}`;
    if (type?.trim())              updates.type_id     = await findOrCreateEventType(type.trim());

    if (name?.trim()) {
      const isDuplicate = await findEventByNameAndOrganizer(name.trim(), organizerId, eventId);
      if (isDuplicate) {
        return res.status(409).json({ message: `ชื่อ Event "${name.trim()}" มีอยู่ใน Organizer นี้แล้ว กรุณาใช้ชื่ออื่น` });
      }
    }

    await updateEvent(eventId, updates as Parameters<typeof updateEvent>[1]);

    // Remove deleted images
    const bodyRaw = req.body as Record<string, string | string[]>;
    const removeRaw = bodyRaw["remove_image_ids[]"];
    if (removeRaw) {
      const ids = Array.isArray(removeRaw) ? removeRaw : [removeRaw];
      for (const id of ids) {
        const numId = Number(id);
        if (!isNaN(numId)) await deleteEventImage(numId);
      }
    }

    // Reorder existing images: reorder_images[{id}]={order}
    const reorderKeys = Object.keys(req.body as object).filter((k) => k.startsWith("reorder_images["));
    for (const key of reorderKeys) {
      const match = key.match(/^reorder_images\[(\d+)\]$/);
      if (!match) continue;
      const imgId = Number(match[1]);
      const order = Number((req.body as Record<string, string>)[key]);
      if (!isNaN(imgId) && !isNaN(order)) await updateEventImageOrder(imgId, order);
    }

    // Add new images
    const newImages = files["event_images"] ?? [];
    if (newImages.length > 0) {
      let maxOrder = await getMaxDisplayOrder(eventId);
      for (const imgFile of newImages) {
        await insertEventImage(eventId, `/uploads/event/${imgFile.filename}`, ++maxOrder);
      }
    }

    const updated = await findEventById(eventId);
    return res.json({ message: "Event updated successfully", event: updated });
  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    return res.status(500).json({ message: "Error updating event" });
  }
}

// ─── Zone CRUD ────────────────────────────────────────────────────────────────

export async function listZones(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;
    const zones = await listZonesByEvent(eventId);
    return res.json({ zones });
  } catch (err) {
    console.error("LIST ZONES ERROR:", err);
    return res.status(500).json({ message: "Error fetching zones" });
  }
}

// ─── Soft Delete Event ────────────────────────────────────────────────────────

export async function softDeleteEventHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const existing = await findEventById(eventId);
    if (!existing || existing.organizer_id !== organizerId) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (existing.status === "deleted") {
      return res.status(409).json({ message: "Event ถูกลบไปแล้ว" });
    }

    // ── ถ้า status ไม่ใช่ "approved" → ลบได้เลย (pending/rejected ยังไม่เปิดขาย) ──
    if (existing.status !== "approved") {
      await updateEvent(eventId, { status: "deleted" });
      return res.json({ message: "ลบ Event สำเร็จ (soft delete)" });
    }

    // ── status === "approved": ต้องเช็คเงื่อนไขเพิ่ม ──
    const now = new Date();
    const startDate = new Date(existing.start_date);
    const endDate = new Date(existing.end_date);
    const isOngoing = now >= startDate && now <= endDate;

    // ── ตรวจสอบ: มีตั๋วที่ถูกซื้อแล้ว ──
    const paidRows = await query<{ paid_count: number }[]>(
      `SELECT COUNT(*) AS paid_count
       FROM (
         SELECT t.id
         FROM tickets t
         JOIN seats s ON s.id = t.seat_id
         JOIN zones z ON z.id = s.zone_id
         WHERE z.event_id = ? AND t.status IN ('paid', 'checked_in')
         UNION ALL
         SELECT wl.id
         FROM white_list wl
         WHERE wl.event_id = ?
       ) AS event_admissions`,
      [eventId, eventId],
    );
    const paidCount = Number(paidRows[0]?.paid_count ?? 0);

    if (isOngoing && paidCount > 0) {
      return res.status(403).json({
        message: `ไม่สามารถลบได้ เนื่องจากกิจกรรมกำลังดำเนินอยู่และมีผู้ซื้อตั๋วแล้ว ${paidCount} ใบ`,
      });
    }

    if (paidCount > 0 && !isOngoing && now < startDate) {
      // งานยังไม่เริ่ม แต่มีคนซื้อตั๋วแล้ว → ห้ามลบ
      return res.status(403).json({
        message: `ไม่สามารถลบได้ เนื่องจากมีผู้ซื้อตั๋วแล้ว ${paidCount} ใบ`,
      });
    }

    await updateEvent(eventId, { status: "deleted" });

    return res.json({ message: "ลบ Event สำเร็จ (soft delete)" });
  } catch (err) {
    console.error("SOFT DELETE EVENT ERROR:", err);
    return res.status(500).json({ message: "Error deleting event" });
  }
}

export async function createZoneHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const { name, category, type, price, seat_count } = req.body;
  if (!name?.trim() || !category?.trim() || !type?.trim()) {
    return res.status(400).json({ message: "name, category, type are required" });
  }

  const files = getFiles(req);
  const zoneImageFiles = files["zone_images"] ?? [];

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const zoneId = await createZone({
      event_id: eventId,
      name: name.trim(),
      category: category.trim(),
      type: type.trim(),
      price: Number(price) || 0,
    });

    // Auto-generate seats if seat_count provided
    const seatCount = parseInt(seat_count ?? "0", 10);
    if (seatCount > 0) await setSeatCount(zoneId, seatCount);

    // Insert zone images
    for (let i = 0; i < zoneImageFiles.length; i++) {
      const file = zoneImageFiles[i];
      await insertZoneImage(zoneId, `/uploads/zone/${file?.filename}`, file?.originalname, i + 1);
    }

    const zones = await listZonesByEvent(eventId);
    return res.status(201).json({ message: "Zone created", zoneId, zones });
  } catch (err) {
    console.error("CREATE ZONE ERROR:", err);
    return res.status(500).json({ message: "Error creating zone" });
  }
}

export async function updateZoneHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  const zoneId = Number(req.params.zoneId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(zoneId)) return res.status(400).json({ message: "Invalid ID" });

  const { name, category, type, price, seat_count } = req.body;
  const files = getFiles(req);
  const zoneImageFiles = files["zone_images"] ?? [];

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const zone = await findZoneById(zoneId);
    if (!zone || zone.event_id !== eventId) return res.status(404).json({ message: "Zone not found" });

    await updateZone(zoneId, {
      ...(name?.trim() && { name: name.trim() }),
      ...(category?.trim() && { category: category.trim() }),
      ...(type?.trim() && { type: type.trim() }),
      ...(price !== undefined && { price: Number(price) }),
    });

    // Adjust seat count if provided
    if (seat_count !== undefined) {
      const target = parseInt(seat_count, 10);
      if (!isNaN(target) && target >= 0) await setSeatCount(zoneId, target);
    }

    // Remove deleted zone images
    const bodyRaw = req.body as Record<string, string | string[]>;
    const removeRaw = bodyRaw["remove_image_ids[]"];
    if (removeRaw) {
      const ids = Array.isArray(removeRaw) ? removeRaw : [removeRaw];
      for (const id of ids) {
        const numId = Number(id);
        if (!isNaN(numId)) await deleteZoneImage(numId);
      }
    }

    // Add new zone images
    if (zoneImageFiles.length > 0) {
      let maxOrder = await getMaxZoneImageOrder(zoneId);
      for (const file of zoneImageFiles) {
        await insertZoneImage(zoneId, `/uploads/zone/${file.filename}`, file.originalname, ++maxOrder);
      }
    }

    const zones = await listZonesByEvent(eventId);
    return res.json({ message: "Zone updated", zones });
  } catch (err) {
    console.error("UPDATE ZONE ERROR:", err);
    return res.status(500).json({ message: "Error updating zone" });
  }
}

export async function deleteZoneHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  const zoneId = Number(req.params.zoneId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(zoneId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const zone = await findZoneById(zoneId);
    if (!zone || zone.event_id !== eventId) return res.status(404).json({ message: "Zone not found" });

    await deleteZone(zoneId);
    const zones = await listZonesByEvent(eventId);
    return res.json({ message: "Zone deleted", zones });
  } catch (err) {
    console.error("DELETE ZONE ERROR:", err);
    return res.status(500).json({ message: "Error deleting zone" });
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboard(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return;

    const now = new Date();
    const platformFeePercent = await getPlatformFeePercent();

    // ── All events for this organizer with stats ──
    const { query } = await import("../model/query.js");

    const events = await query<{
      id: number;
      name: string;
      cover_image: string;
      status: string;
      is_active: number;
      start_date: string;
      end_date: string;
      place_name: string;
      type_name: string;
      total_seats: number;
      sold_tickets: number;
      revenue: number;
      net_revenue: number;
      checkins: number;
    }[]>(
      `SELECT
         e.id, e.name, e.cover_image, e.status, e.is_active,
         e.start_date, e.end_date, e.place_name,
         et.name AS type_name,
         COALESCE(seat_stats.total_seats, 0) AS total_seats,
         COALESCE(ticket_stats.sold_tickets, 0) AS sold_tickets,
         COALESCE(ticket_stats.revenue, 0)      AS revenue,
         COALESCE(ticket_stats.net_revenue, 0) AS net_revenue,
         COALESCE(ticket_stats.checkins, 0)     AS checkins
       FROM events e
       JOIN event_types et ON et.id = e.type_id
       -- Total seats across all zones
       LEFT JOIN (
         SELECT z.event_id, COUNT(s.id) AS total_seats
         FROM zones z
         LEFT JOIN seats s ON s.zone_id = z.id
         GROUP BY z.event_id
       ) seat_stats ON seat_stats.event_id = e.id
       -- Ticket stats use recorded payment amounts, with zone price as a legacy fallback.
       LEFT JOIN (
         SELECT
           t.event_id,
           COUNT(t.id)                                                        AS sold_tickets,
           SUM(COALESCE(t.gross_amount, z2.price, 0))                         AS revenue,
           SUM(COALESCE(
             t.net_amount,
             t.gross_amount * (1 - ? / 100),
             z2.price * (1 - ? / 100),
             0
           ))                                                               AS net_revenue,
           COUNT(CASE WHEN t.status = 'checked_in' THEN 1 END)               AS checkins
         FROM tickets t
         LEFT JOIN seats  s2 ON s2.id = t.seat_id
         LEFT JOIN zones  z2 ON z2.id = s2.zone_id
         WHERE t.status IN ('paid', 'checked_in')
         GROUP BY t.event_id
       ) ticket_stats ON ticket_stats.event_id = e.id
       WHERE e.organizer_id = ?
       ORDER BY e.start_date DESC`,
      [platformFeePercent, platformFeePercent, organizerId],
    );

    // ── Compute event lifecycle status ──
    function eventLifecycle(e: typeof events[0]): "live" | "upcoming" | "ended" | "pending" | "rejected" {
      if (e.status === "pending")  return "pending";
      if (e.status === "rejected") return "rejected";
      const start = new Date(e.start_date);
      const end   = new Date(e.end_date);
      if (now >= start && now <= end) return "live";
      if (now < start)               return "upcoming";
      return "ended";
    }

    // ── KPI aggregates ──
    const totalEvents   = events.length;
    const liveCount     = events.filter((e) => eventLifecycle(e) === "live").length;
    const upcomingCount = events.filter((e) => eventLifecycle(e) === "upcoming").length;
    const endedCount    = events.filter((e) => eventLifecycle(e) === "ended").length;

    const totalSeats   = events.reduce((s, e) => s + Number(e.total_seats), 0);
    const totalSold    = events.reduce((s, e) => s + Number(e.sold_tickets), 0);
    const totalRevenue = events.reduce((s, e) => s + Number(e.revenue), 0);
    const totalNetRevenue = events.reduce((s, e) => s + Number(e.net_revenue), 0);
    const totalCheckin = events.reduce((s, e) => s + Number(e.checkins), 0);

    const attendanceRate = totalSold > 0 ? Math.round((totalCheckin / totalSold) * 100) : 0;
    const capacityRate   = totalSeats > 0 ? Math.round((totalSold / totalSeats) * 100) : 0;

    // ── Enrich events with lifecycle + derived fields ──
    const enriched = events.map((e) => {
      const lifecycle = eventLifecycle(e);
      const isSoldOut = Number(e.total_seats) > 0 && Number(e.sold_tickets) >= Number(e.total_seats);
      const salesPct = Number(e.total_seats) > 0
        ? Math.round((Number(e.sold_tickets) / Number(e.total_seats)) * 100)
        : null;
      const checkinPct = Number(e.sold_tickets) > 0
        ? Math.round((Number(e.checkins) / Number(e.sold_tickets)) * 100)
        : 0;

      return {
        id: e.id,
        name: e.name,
        cover_image: e.cover_image,
        status: e.status,
        is_active: Boolean(e.is_active),
        lifecycle,
        is_sold_out: isSoldOut,
        start_date: e.start_date,
        end_date: e.end_date,
        place_name: e.place_name,
        type_name: e.type_name,
        total_seats: Number(e.total_seats),
        sold_tickets: Number(e.sold_tickets),
        revenue: Number(e.revenue),
        net_revenue: Number(e.net_revenue),
        platform_fee_percent: platformFeePercent,
        checkins: Number(e.checkins),
        sales_pct: salesPct,
        checkin_pct: checkinPct,
      };
    });

    return res.json({
      kpi: {
        total_events: totalEvents,
        live: liveCount,
        upcoming: upcomingCount,
        ended: endedCount,
        total_seats: totalSeats,
        total_sold: totalSold,
        total_revenue: totalRevenue,
        total_net_revenue: totalNetRevenue,
        platform_fee_percent: platformFeePercent,
        total_checkins: totalCheckin,
        attendance_rate: attendanceRate,
        capacity_rate: capacityRate,
      },
      events: enriched,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return res.status(500).json({ message: "Error fetching dashboard" });
  }
}

// ─── Stripe Connect Onboarding ────────────────────────────────────────────────

export async function createStripeOnboardLinkHandler(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await resolveOrganizerOwner(req, res, organizerId);
    if (!organizer) return; // resolveOrganizerOwner จัดการ response 403/404 ให้แล้ว

    let accountId = organizer.stripe_id;

    // 1. ถ้ายังไม่มี Stripe Account ให้สร้างบัญชี Custom / Express Account ใหม่
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        country: "TH", // หรือประเทศที่รองรับ เช่น TH, US
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: organizer.name,
        },
      });

      accountId = account.id;

      // บันทึก stripe_account_id ลง Database ของ organizer
      await updateOrganizer(organizerId, {
        stripe_id: accountId,
      } as Parameters<typeof updateOrganizer>[1]);
    }

    // 2. กำหนด URL สำหรับ Redirect กลับเมื่อกรอกเสร็จ หรือเมื่อกดยกเลิก
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const refreshUrl = `${frontendUrl}/profile/organizers/${organizerId}/settings`;
    const returnUrl = `${frontendUrl}/profile/organizers/${organizerId}/settings?stripe_status=return`;

    // 3. สร้าง Account Link สำหรับกระบวนการ Onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    // 4. ส่ง onboarding_url กลับไปให้ Frontend
    return res.json({
      onboarding_url: accountLink.url,
      stripe_account_id: accountId,
    });
  } catch (err: any) {
    console.error("STRIPE ONBOARD ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error generating Stripe onboarding link",
    });
  }
}

/**
 * Cancel a ticket (organizer only)
 * POST /organizer/:id/cancel-ticket
 */
export async function cancelTicket(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const organizerId = Number(req.params.id);
  const { ticket_id } = req.body as { ticket_id: number };

  if (!ticket_id) {
    return res.status(400).json({ message: "ticket_id is required" });
  }

  try {
    // Verify this ticket belongs to an event owned by this organizer
    const ticketCheck = await query<{ id: number; organizer_id: number; status: string }[]>(
      `SELECT t.id, e.organizer_id, t.status
       FROM tickets t
       JOIN zones z ON z.id = t.zone_id
       JOIN events e ON e.id = z.event_id
       WHERE t.id = ?
       LIMIT 1`,
      [ticket_id],
    );

    if (!ticketCheck.length) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticketCheck[0].organizer_id !== organizerId) {
      return res.status(403).json({ message: "This ticket does not belong to your event" });
    }

    if (ticketCheck[0].status === "cancelled") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Cancel the ticket
    await query(
      `UPDATE tickets SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [ticket_id],
    );

    return res.json({ message: "Ticket cancelled successfully" });
  } catch (err: any) {
    console.error("CANCEL TICKET ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error cancelling ticket",
    });
  }
}
