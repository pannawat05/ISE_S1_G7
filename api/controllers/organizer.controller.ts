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
} from "../model/event.model.js";
import {
  createOrganizer,
  findOrganizerById,
  updateOrganizer,
  deleteOrganizer,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    description, theme, type, type_id, start_date, end_date, is_active,
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
    description, theme, type, start_date, end_date, is_active,
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
    if (start_date)                updates.start_date  = start_date;
    if (end_date)                  updates.end_date    = end_date;
    if (is_active !== undefined)   updates.is_active   = is_active !== false && is_active !== "false";
    if (coverFile)                 updates.cover_image = `/uploads/event/${coverFile.filename}`;
    if (type?.trim())              updates.type_id     = await findOrCreateEventType(type.trim());

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
