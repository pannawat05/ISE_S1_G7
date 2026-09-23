import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import fs from "fs";
import {
  listDocumentsByEvent,
  insertDocument,
  findDocumentById,
  deleteDocument,
} from "../model/document.model.js";
import { findOrganizerById } from "../model/organizer.model.js";
import { query } from "../model/query.js";

// ─── Guard: verify organizer owns the event ───────────────────────────────────
async function verifyEventOwner(
  req: AuthRequest,
  res: Response,
  organizerId: number,
  eventId: number,
) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return false; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return false; }

  const events = await query<{ id: number }[]>(
    "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
    [eventId, organizerId],
  );
  if (!events.length) { res.status(404).json({ message: "Event not found" }); return false; }
  return true;
}

// ─── GET /organizer/:id/events/:eventId/documents ─────────────────────────────
export async function listDocuments(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const ok = await verifyEventOwner(req, res, organizerId, eventId);
    if (!ok) return;
    const docs = await listDocumentsByEvent(eventId);
    return res.json({ documents: docs });
  } catch (err) {
    console.error("LIST DOCUMENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching documents" });
  }
}

// ─── POST /organizer/:id/events/:eventId/documents ────────────────────────────
export async function uploadDocuments(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const files = (req as AuthRequest & { files?: Express.Multer.File[] }).files ?? [];

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  try {
    const ok = await verifyEventOwner(req, res, organizerId, eventId);
    if (!ok) {
      // Clean up uploaded files
      for (const f of files) {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      return;
    }

    for (const file of files) {
      await insertDocument({
        event_id:    eventId,
        name:        file.originalname,
        file_url:    `/uploads/documents/${file.filename}`,
        file_type:   file.mimetype,
        file_size:   file.size,
        uploaded_by: req.user!.id,
      });
    }

    const docs = await listDocumentsByEvent(eventId);
    return res.status(201).json({ message: "Uploaded successfully", documents: docs });
  } catch (err) {
    console.error("UPLOAD DOCUMENTS ERROR:", err);
    return res.status(500).json({ message: "Error uploading documents" });
  }
}

// ─── DELETE /organizer/:id/events/:eventId/documents/:docId ──────────────────
export async function removeDocument(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  const docId       = Number(req.params.docId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(docId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const ok = await verifyEventOwner(req, res, organizerId, eventId);
    if (!ok) return;

    const doc = await findDocumentById(docId);
    if (!doc || doc.event_id !== eventId) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Delete file from disk
    const filePath = `.${doc.file_url}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await deleteDocument(docId);
    const docs = await listDocumentsByEvent(eventId);
    return res.json({ message: "Deleted", documents: docs });
  } catch (err) {
    console.error("DELETE DOCUMENT ERROR:", err);
    return res.status(500).json({ message: "Error deleting document" });
  }
}
