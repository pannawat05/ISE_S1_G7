import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { execute, query } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";

async function verifyOwner(req: AuthRequest, res: Response, organizerId: number) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return false; }
  if (organizer.owner_id !== req.user?.id) { res.status(403).json({ message: "Forbidden" }); return false; }
  return true;
}

async function verifyEvent(eventId: number, organizerId: number) {
  const rows = await query<{ id: number }[]>(
    "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
    [eventId, organizerId],
  );
  return rows.length > 0;
}

export async function listEventStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (!Number.isFinite(organizerId) || !Number.isFinite(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    if (!await verifyOwner(req, res, organizerId)) return;
    if (!await verifyEvent(eventId, organizerId)) return res.status(404).json({ message: "Event not found" });
    const staff = await query<{
      assignment_id: number; staff_id: number; user_id: number;
      f_name: string; l_name: string; email: string; staff_role: string; event_role: string;
    }[]>(
      `SELECT es.id AS assignment_id, s.id AS staff_id, u.id AS user_id,
              u.f_name, u.l_name, u.email, s.role AS staff_role, es.role AS event_role
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       JOIN users u ON u.id = s.users_id
       WHERE es.event_id = ? AND s.organizer_id = ?
       ORDER BY es.assigned_at DESC`,
      [eventId, organizerId],
    );
    return res.json({ staff });
  } catch (err) {
    console.error("LIST EVENT STAFF ERROR:", err);
    return res.status(500).json({ message: "Error fetching event staff" });
  }
}

export async function assignEventStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  const userId = Number(req.body.user_id);
  const eventRole = String(req.body.role ?? "checkin");
  const allowedRoles = ["checkin", "security", "registration", "backstage", "manager"];
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (!Number.isFinite(organizerId) || !Number.isFinite(eventId) || !Number.isFinite(userId)) return res.status(400).json({ message: "Invalid ID" });
  if (!allowedRoles.includes(eventRole)) return res.status(400).json({ message: "Invalid staff role" });

  try {
    if (!await verifyOwner(req, res, organizerId)) return;
    if (!await verifyEvent(eventId, organizerId)) return res.status(404).json({ message: "Event not found" });
    const user = await query<{ id: number; f_name: string; l_name: string; email: string }[]>(
      "SELECT id, f_name, l_name, email FROM users WHERE id = ? LIMIT 1", [userId],
    );
    if (!user.length) return res.status(404).json({ message: "User not found" });

    let staff = await query<{ id: number }[]>(
      "SELECT id FROM staff WHERE users_id = ? AND organizer_id = ? LIMIT 1", [userId, organizerId],
    );
    if (!staff.length) {
      const result = await execute(
        "INSERT INTO staff (role, join_date, users_id, organizer_id) VALUES ('general_staff', NOW(), ?, ?)",
        [userId, organizerId],
      );
      staff = [{ id: result.insertId }];
    }
    await execute("INSERT INTO event_staff (event_id, staff_id, role) VALUES (?, ?, ?)", [eventId, staff[0].id, eventRole]);
    return res.status(201).json({ message: "Staff assigned", assignment_id: staff[0].id });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") return res.status(409).json({ message: "User นี้ถูก assign ใน event แล้ว" });
    console.error("ASSIGN EVENT STAFF ERROR:", err);
    return res.status(500).json({ message: "Error assigning staff" });
  }
}

export async function removeEventStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  const assignmentId = Number(req.params.assignmentId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (![organizerId, eventId, assignmentId].every(Number.isFinite)) return res.status(400).json({ message: "Invalid ID" });

  try {
    if (!await verifyOwner(req, res, organizerId)) return;
    const result = await execute(
      `DELETE es FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       WHERE es.id = ? AND es.event_id = ? AND s.organizer_id = ?`,
      [assignmentId, eventId, organizerId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Staff assignment not found" });
    return res.json({ message: "Staff removed" });
  } catch (err) {
    console.error("REMOVE EVENT STAFF ERROR:", err);
    return res.status(500).json({ message: "Error removing staff" });
  }
}