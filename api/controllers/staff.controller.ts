/**
 * staff.controller.ts
 * Organizer จัดการ Staff ของตัวเอง
 *
 * Staff flow:
 *   1. Organizer ค้นหา user → เพิ่มเป็น staff ของ organizer (INSERT staff)
 *   2. Organizer เลือก staff → เพิ่มเข้างาน (INSERT event_staff)
 *   3. ลบ staff ออกจาก organizer → cascade ลบ event_staff ด้วย
 */

import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";

// ─── Guard ────────────────────────────────────────────────────────────────────
async function verifyOwner(req: AuthRequest, res: Response, organizerId: number) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return null; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return null; }
  return organizer;
}

// ─── Staff roles ──────────────────────────────────────────────────────────────
const STAFF_ROLES = ["general_staff", "manager"] as const;
const EVENT_STAFF_ROLES = ["checkin", "security", "registration", "backstage", "manager"] as const;
type StaffRole = typeof STAFF_ROLES[number];
type EventStaffRole = typeof EVENT_STAFF_ROLES[number];

// ─── GET /organizer/:id/staff ─────────────────────────────────────────────────
export async function listStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const staff = await query<{
      id: number; role: string; join_date: string;
      users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT s.id, s.role, s.join_date,
              u.id AS users_id, u.f_name, u.l_name, u.email
       FROM staff s
       JOIN users u ON u.id = s.users_id
       WHERE s.organizer_id = ?
       ORDER BY s.join_date DESC`,
      [organizerId],
    );
    return res.json({ staff });
  } catch (err) {
    console.error("LIST STAFF ERROR:", err);
    return res.status(500).json({ message: "Error fetching staff" });
  }
}

// ─── POST /organizer/:id/staff ────────────────────────────────────────────────
export async function addStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId)) return res.status(400).json({ message: "Invalid ID" });

  const { users_id, role = "general_staff" } = req.body as {
    users_id: number; role?: StaffRole;
  };

  if (!users_id || isNaN(Number(users_id))) {
    return res.status(400).json({ message: "users_id is required" });
  }
  if (!STAFF_ROLES.includes(role as StaffRole)) {
    return res.status(400).json({ message: `role must be one of: ${STAFF_ROLES.join(", ")}` });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    // Verify user exists
    const users = await query<{ id: number; f_name: string; l_name: string; email: string }[]>(
      "SELECT id, f_name, l_name, email FROM users WHERE id = ? LIMIT 1",
      [Number(users_id)],
    );
    if (!users.length) return res.status(404).json({ message: "User not found" });

    // Prevent owner adding themselves
    if (Number(users_id) === req.user.id) {
      return res.status(400).json({ message: "ไม่สามารถเพิ่มตัวเองเป็น staff ได้" });
    }

    try {
      await execute(
        "INSERT INTO staff (users_id, organizer_id, role, join_date) VALUES (?, ?, ?, NOW())",
        [Number(users_id), organizerId, role],
      );
    } catch (dupErr: unknown) {
      if ((dupErr as { code?: string }).code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "User นี้เป็น staff ของ organizer นี้อยู่แล้ว" });
      }
      throw dupErr;
    }

    const staff = await query<{
      id: number; role: string; join_date: string;
      users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT s.id, s.role, s.join_date, u.id AS users_id, u.f_name, u.l_name, u.email
       FROM staff s JOIN users u ON u.id = s.users_id
       WHERE s.organizer_id = ? ORDER BY s.join_date DESC`,
      [organizerId],
    );
    return res.status(201).json({
      message: `เพิ่ม ${users[0].f_name} เป็น staff สำเร็จ`,
      staff,
    });
  } catch (err) {
    console.error("ADD STAFF ERROR:", err);
    return res.status(500).json({ message: "Error adding staff" });
  }
}

// ─── PATCH /organizer/:id/staff/:staffId — เปลี่ยน role ──────────────────────
export async function updateStaffRole(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const staffId     = Number(req.params.staffId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(staffId)) return res.status(400).json({ message: "Invalid ID" });

  const { role } = req.body as { role: StaffRole };
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${STAFF_ROLES.join(", ")}` });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<{ id: number }[]>(
      "SELECT id FROM staff WHERE id = ? AND organizer_id = ? LIMIT 1",
      [staffId, organizerId],
    );
    if (!rows.length) return res.status(404).json({ message: "Staff not found" });

    await execute("UPDATE staff SET role = ? WHERE id = ?", [role, staffId]);
    return res.json({ message: "อัปเดต role สำเร็จ" });
  } catch (err) {
    console.error("UPDATE STAFF ROLE ERROR:", err);
    return res.status(500).json({ message: "Error updating staff role" });
  }
}

// ─── DELETE /organizer/:id/staff/:staffId ─────────────────────────────────────
export async function removeStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const staffId     = Number(req.params.staffId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(staffId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<{ id: number }[]>(
      "SELECT id FROM staff WHERE id = ? AND organizer_id = ? LIMIT 1",
      [staffId, organizerId],
    );
    if (!rows.length) return res.status(404).json({ message: "Staff not found" });

    // event_staff cascades automatically via FK
    await execute("DELETE FROM staff WHERE id = ?", [staffId]);

    const staff = await query<{
      id: number; role: string; join_date: string;
      users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT s.id, s.role, s.join_date, u.id AS users_id, u.f_name, u.l_name, u.email
       FROM staff s JOIN users u ON u.id = s.users_id
       WHERE s.organizer_id = ? ORDER BY s.join_date DESC`,
      [organizerId],
    );
    return res.json({ message: "ลบ staff สำเร็จ", staff });
  } catch (err) {
    console.error("REMOVE STAFF ERROR:", err);
    return res.status(500).json({ message: "Error removing staff" });
  }
}

// ─── GET /organizer/:id/events/:eventId/staff ─────────────────────────────────
export async function listEventStaff(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const eventStaff = await query<{
      event_id: number; staff_id: number; role: string; assigned_at: string;
      staff_role: string; users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT es.event_id, es.staff_id, es.role, es.assigned_at,
              s.role AS staff_role,
              u.id   AS users_id, u.f_name, u.l_name, u.email
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       JOIN users u ON u.id = s.users_id
       WHERE es.event_id = ?
       ORDER BY es.assigned_at DESC`,
      [eventId],
    );
    return res.json({ event_staff: eventStaff });
  } catch (err) {
    console.error("LIST EVENT STAFF ERROR:", err);
    return res.status(500).json({ message: "Error fetching event staff" });
  }
}

// ─── POST /organizer/:id/events/:eventId/staff ────────────────────────────────
export async function assignStaffToEvent(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const { staff_id, role } = req.body as { staff_id: number; role: EventStaffRole };
  if (!staff_id || isNaN(Number(staff_id))) {
    return res.status(400).json({ message: "staff_id is required" });
  }
  if (!EVENT_STAFF_ROLES.includes(role as EventStaffRole)) {
    return res.status(400).json({ message: `role must be one of: ${EVENT_STAFF_ROLES.join(", ")}` });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    // Verify event belongs to organizer
    const eventRows = await query<{ id: number }[]>(
      "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
      [eventId, organizerId],
    );
    if (!eventRows.length) return res.status(404).json({ message: "Event not found" });

    // Verify staff belongs to organizer
    const staffRows = await query<{ id: number; f_name: string; l_name: string }[]>(
      `SELECT s.id, u.f_name, u.l_name
       FROM staff s JOIN users u ON u.id = s.users_id
       WHERE s.id = ? AND s.organizer_id = ? LIMIT 1`,
      [Number(staff_id), organizerId],
    );
    if (!staffRows.length) return res.status(404).json({ message: "Staff not found in this organizer" });

    try {
      await execute(
        "INSERT INTO event_staff (event_id, staff_id, role) VALUES (?, ?, ?)",
        [eventId, Number(staff_id), role],
      );
    } catch (dupErr: unknown) {
      if ((dupErr as { code?: string }).code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Staff นี้ถูก assign เข้างานนี้แล้ว" });
      }
      throw dupErr;
    }

    const eventStaff = await query<{
      event_id: number; staff_id: number; role: string; assigned_at: string;
      users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT es.event_id, es.staff_id, es.role, es.assigned_at,
              u.id AS users_id, u.f_name, u.l_name, u.email
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       JOIN users u ON u.id = s.users_id
       WHERE es.event_id = ? ORDER BY es.assigned_at DESC`,
      [eventId],
    );
    return res.status(201).json({
      message: `Assign ${staffRows[0].f_name} เข้างานสำเร็จ`,
      event_staff: eventStaff,
    });
  } catch (err) {
    console.error("ASSIGN STAFF ERROR:", err);
    return res.status(500).json({ message: "Error assigning staff" });
  }
}

// ─── DELETE /organizer/:id/events/:eventId/staff/:staffId ────────────────────
export async function removeStaffFromEvent(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  const staffId     = Number(req.params.staffId);   // composite key component
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(staffId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    // Check entry exists by composite PK
    const rows = await query<{ staff_id: number }[]>(
      "SELECT staff_id FROM event_staff WHERE event_id = ? AND staff_id = ? LIMIT 1",
      [eventId, staffId],
    );
    if (!rows.length) return res.status(404).json({ message: "Event staff entry not found" });

    // Delete by composite PK
    await execute("DELETE FROM event_staff WHERE event_id = ? AND staff_id = ?", [eventId, staffId]);

    const eventStaff = await query<{
      event_id: number; staff_id: number; role: string; assigned_at: string;
      users_id: number; f_name: string; l_name: string; email: string;
    }[]>(
      `SELECT es.event_id, es.staff_id, es.role, es.assigned_at,
              u.id AS users_id, u.f_name, u.l_name, u.email
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       JOIN users u ON u.id = s.users_id
       WHERE es.event_id = ? ORDER BY es.assigned_at DESC`,
      [eventId],
    );
    return res.json({ message: "ลบ event staff สำเร็จ", event_staff: eventStaff });
  } catch (err) {
    console.error("REMOVE EVENT STAFF ERROR:", err);
    return res.status(500).json({ message: "Error removing event staff" });
  }
}
