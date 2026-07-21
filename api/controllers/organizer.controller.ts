import type { Response } from "express";
import type { AuthRequest, OrganizeRequest } from "../middlewares/types.js";
import type { EventStatus } from "../model/types.js";
import {
  createEvent,
  findEventsByOrganizerId,
  findOrCreateEventType,
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

  const { name, place_name, address, latitude, longitude, description, theme, type, start_date, end_date, is_active } = req.body;

  if (!name?.trim() || !place_name?.trim() || !type?.trim() || !start_date || !end_date) {
    return res.status(400).json({ message: "name, place_name, type, start_date, end_date are required" });
  }

  try {
    const organizer = await findOrganizerById(organizerId);
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });
    if (organizer.owner_id !== userId) return res.status(403).json({ message: "Forbidden" });

    const typeId = await findOrCreateEventType(type);
    const eventId = await createEvent({
      name: name.trim(),
      place_name: place_name.trim(),
      address: address ?? null,
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      cover_image: "",
      description: description ?? null,
      theme: theme ?? null,
      status: "pending",
      is_active: is_active !== false,
      start_date,
      end_date,
      organizer_id: organizerId,
      type_id: typeId,
    });

    return res.status(201).json({ message: "Event created successfully", eventId });
  } catch (err) {
    console.error("CREATE EVENT FOR ORGANIZER ERROR:", err);
    return res.status(500).json({ message: "Error creating event" });
  }
}
