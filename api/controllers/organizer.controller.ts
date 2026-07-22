import type { Response } from "express";
import type { AuthRequest, OrganizeRequest } from "../middlewares/types.js";
import type { EventStatus } from "../model/types.js";
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
  findOrganizerByOwnerId,
  findOrganizerById,
  updateOrganizer,
  deleteOrganizer,
} from "../model/organizer.model.js";

function mapFrontendStatus(status: string | undefined): EventStatus {
  switch (status?.toLowerCase()) {
    case "published":
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}

function buildEndDate(startDate: string): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return startDate;
  }
  start.setHours(start.getHours() + 3);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())} ${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
}

export async function addEvent(req: OrganizeRequest, res: Response) {
  const {
    name,
    place,
    place_name,
    type,
    start_date,
    end_date,
    description,
    theme,
    status,
    is_active,
    address,
    latitude,
    longitude,
    cover_image,
  } = req.body;

  const organizerId = req.user?.organizerId;

  if (!organizerId) {
    return res.status(401).json({ message: "Unauthorized: Missing organizer ID" });
  }

  const eventName = name?.trim();
  const eventPlace = (place_name ?? place)?.trim();

  if (!eventName || !eventPlace || !start_date || !type) {
    return res.status(400).json({
      message: "name, place, type, and start_date are required",
    });
  }

  try {
    const typeId = await findOrCreateEventType(type);
    const eventId = await createEvent({
      name: eventName,
      place_name: eventPlace,
      address: address ?? null,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      cover_image: cover_image ?? "",
      description: description ?? null,
      theme: theme ?? null,
      status: mapFrontendStatus(status),
      is_active: is_active === 0 || is_active === false ? false : true,
      start_date,
      end_date: end_date ?? buildEndDate(start_date),
      organizer_id: organizerId,
      type_id: typeId,
    });

    return res.status(201).json({
      message: "Event added successfully",
      eventId,
    });
  } catch (err) {
    console.error("ADD EVENT ERROR:", err);
    return res.status(500).json({ message: "Error adding event" });
  }
}

export async function listEvents(req: OrganizeRequest, res: Response) {
  const organizerId = req.user?.organizerId;

  if (!organizerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const events = await findEventsByOrganizerId(organizerId);
    return res.json({ events });
  } catch (err) {
    console.error("LIST EVENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}

export async function createOrganizerHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name, description } = req.body;
  const logoFile = (req as AuthRequest & { file?: Express.Multer.File }).file;

  if (!name?.trim()) {
    return res.status(400).json({ message: "ชื่อ Organizer is required" });
  }

  try {
    const logoUrl = logoFile
      ? `/uploads/organizer/logo/${logoFile.filename}`
      : "";

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

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (Number.isNaN(organizerId)) {
    return res.status(400).json({ message: "Invalid organizer ID" });
  }

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Check ownership
    if (organizer.owner_id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

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

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (Number.isNaN(organizerId)) {
    return res.status(400).json({ message: "Invalid organizer ID" });
  }

  const { name, description } = req.body;
  const logoFile = (req as AuthRequest & { file?: Express.Multer.File }).file;

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (organizer.owner_id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

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

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (Number.isNaN(organizerId)) {
    return res.status(400).json({ message: "Invalid organizer ID" });
  }

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (organizer.owner_id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await deleteOrganizer(organizerId);

    return res.json({ message: "Organizer deleted successfully" });
  } catch (err) {
    console.error("DELETE ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error deleting organizer" });
  }
}

export async function listEventsByOrganizer(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (Number.isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });

    const events = await findEventsByOrganizerId(organizerId);
    return res.json({ events });
  } catch (err) {
    console.error("LIST EVENTS BY ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error fetching events" });
  }
}

export async function createEventForOrganizer(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (Number.isNaN(organizerId)) return res.status(400).json({ message: "Invalid organizer ID" });

  const { name, place_name, address, latitude, longitude, description, theme, type, type_id, start_date, end_date, is_active } = req.body;

  // Accept type_id (number from frontend dropdown) OR type (string, fallback)
  const resolvedTypeId = type_id ? Number(type_id) : null;

  if (!name?.trim() || !place_name?.trim() || !start_date || !end_date) {
    return res.status(400).json({ message: "name, place_name, start_date, end_date are required" });
  }
  if (!resolvedTypeId && !type?.trim()) {
    return res.status(400).json({ message: "type_id or type is required" });
  }

  // Extract uploaded files from multer .fields()
  const files = (req as AuthRequest & { files?: Record<string, Express.Multer.File[]> }).files ?? {};
  const coverFile = files["cover_image"]?.[0];
  const coverImageUrl = coverFile ? `/uploads/event/${coverFile.filename}` : "";

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });

    // Use type_id directly if provided, otherwise find/create by name
    const finalTypeId = resolvedTypeId ?? await findOrCreateEventType(type);
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

    // Insert event_images
    const extraImageFiles = files["event_images"] ?? [];
    for (let i = 0; i < extraImageFiles.length; i++) {
      const imgUrl = `/uploads/event/${extraImageFiles[i].filename}`;
      await insertEventImage(eventId, imgUrl, i + 1);
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
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });
    const event = await findEventById(eventId);
    if (!event || event.organizer_id !== organizerId) return res.status(404).json({ message: "Event not found" });
    // event.images is already included by findEventById
    return res.json({ event });
  } catch (err) {
    console.error("GET EVENT ERROR:", err);
    return res.status(500).json({ message: "Error fetching event" });
  }
}

export async function updateEventHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const { name, place_name, address, latitude, longitude, description, theme, type, start_date, end_date, is_active } = req.body;
  const files = (req as AuthRequest & { files?: Record<string, Express.Multer.File[]> }).files ?? {};
  const coverFile = files["cover_image"]?.[0];

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });
    const existing = await findEventById(eventId);
    if (!existing || existing.organizer_id !== organizerId) return res.status(404).json({ message: "Event not found" });

    const updates: Record<string, unknown> = {};
    if (name?.trim())        updates.name = name.trim();
    if (place_name?.trim())  updates.place_name = place_name.trim();
    if (address !== undefined) updates.address = address ?? null;
    if (latitude !== undefined) updates.latitude = Number(latitude);
    if (longitude !== undefined) updates.longitude = Number(longitude);
    if (description !== undefined) updates.description = description ?? null;
    if (theme !== undefined) updates.theme = theme ?? null;
    if (start_date) updates.start_date = start_date;
    if (end_date)   updates.end_date = end_date;
    if (is_active !== undefined) updates.is_active = is_active !== false && is_active !== "false";
    if (coverFile)  updates.cover_image = `/uploads/event/${coverFile.filename}`;
    if (type?.trim()) {
      updates.type_id = await findOrCreateEventType(type.trim());
    }

    await updateEvent(eventId, updates as Parameters<typeof updateEvent>[1]);

    // Handle event images: remove deleted ones
    const bodyRaw = req.body as Record<string, string | string[]>;
    const removeRaw = bodyRaw["remove_image_ids[]"];
    if (removeRaw) {
      const ids = Array.isArray(removeRaw) ? removeRaw : [removeRaw];
      for (const id of ids) {
        const numId = Number(id);
        if (!isNaN(numId)) await deleteEventImage(numId);
      }
    }

    // Handle display_order updates for existing images
    // Format: reorder_images[id]=order  e.g. reorder_images[12]=1&reorder_images[13]=2
    const reorderRaw = bodyRaw as Record<string, string>;
    const reorderKeys = Object.keys(reorderRaw).filter((k) => k.startsWith("reorder_images["));
    for (const key of reorderKeys) {
      const match = key.match(/^reorder_images\[(\d+)\]$/);
      if (!match) continue;
      const imgId = Number(match[1]);
      const order = Number(reorderRaw[key]);
      if (!isNaN(imgId) && !isNaN(order)) {
        await updateEventImageOrder(imgId, order);
      }
    }

    // Handle event images: insert new ones
    const newImageFiles = files["event_images"] ?? [];
    if (newImageFiles.length > 0) {
      let maxOrder = await getMaxDisplayOrder(eventId);
      for (const imgFile of newImageFiles) {
        maxOrder += 1;
        const url = `/uploads/event/${imgFile.filename}`;
        await insertEventImage(eventId, url, maxOrder);
      }
    }

    const updated = await findEventById(eventId);
    return res.json({ message: "Event updated successfully", event: updated });
  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    return res.status(500).json({ message: "Error updating event" });
  }
}
