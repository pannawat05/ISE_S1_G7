import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { query, execute } from "../model/query.js";

// ─── Event Types ──────────────────────────────────────────────────────────────
export async function listEventTypes(_req: AuthRequest, res: Response) {
  try {
    const rows = await query<{ id: number; name: string }[]>(
      "SELECT id, name FROM event_types ORDER BY name ASC",
    );
    return res.json({ event_types: rows });
  } catch (err) {
    console.error("LIST EVENT TYPES:", err);
    return res.status(500).json({ message: "Error" });
  }
}

export async function createEventType(req: AuthRequest, res: Response) {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });
  try {
    const result = await execute("INSERT INTO event_types (name) VALUES (?)", [name]);
    return res.status(201).json({ id: result.insertId, name });
  } catch (err: unknown) {
    const msg = (err as { code?: string }).code === "ER_DUP_ENTRY"
      ? "ประเภทนี้มีอยู่แล้ว"
      : "Error creating event type";
    return res.status(409).json({ message: msg });
  }
}

export async function updateEventType(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const name = String(req.body.name ?? "").trim();
  if (isNaN(id) || !name) return res.status(400).json({ message: "Invalid" });
  try {
    await execute("UPDATE event_types SET name = ? WHERE id = ?", [name, id]);
    return res.json({ id, name });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

export async function deleteEventType(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid" });
  try {
    await execute("DELETE FROM event_types WHERE id = ?", [id]);
    return res.json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Error — อาจมี event ใช้งานประเภทนี้อยู่" });
  }
}

// ─── Payment Methods ──────────────────────────────────────────────────────────
export async function listPaymentMethods(_req: AuthRequest, res: Response) {
  try {
    const rows = await query<{
      id: number; category: string; channel: string;
      gateway: string | null; is_active: number;
    }[]>("SELECT id, category, channel, gateway, is_active FROM payment_methods ORDER BY category, channel");
    return res.json({ payment_methods: rows });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

export async function createPaymentMethod(req: AuthRequest, res: Response) {
  const { category, channel, gateway } = req.body as Record<string, string>;
  if (!category || !channel) return res.status(400).json({ message: "category and channel required" });
  try {
    const result = await execute(
      "INSERT INTO payment_methods (category, channel, gateway, is_active) VALUES (?, ?, ?, 1)",
      [category, channel, gateway ?? null],
    );
    return res.status(201).json({ id: result.insertId, category, channel, gateway: gateway ?? null, is_active: 1 });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

export async function updatePaymentMethod(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const { category, channel, gateway, is_active } = req.body as Record<string, string>;
  if (isNaN(id)) return res.status(400).json({ message: "Invalid" });
  try {
    await execute(
      "UPDATE payment_methods SET category=?, channel=?, gateway=?, is_active=? WHERE id=?",
      [category, channel, gateway ?? null, is_active === "1" || is_active === "true" ? 1 : 0, id],
    );
    return res.json({ message: "Updated" });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

export async function deletePaymentMethod(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid" });
  try {
    await execute("DELETE FROM payment_methods WHERE id = ?", [id]);
    return res.json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Error — อาจมี transaction ใช้งานอยู่" });
  }
}

export async function togglePaymentMethod(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid" });
  try {
    await execute("UPDATE payment_methods SET is_active = NOT is_active WHERE id = ?", [id]);
    return res.json({ message: "Toggled" });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function listUsers(req: AuthRequest, res: Response) {
  const search = String(req.query.search ?? "").trim();
  const role   = String(req.query.role   ?? "").trim();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) { conditions.push("(email LIKE ? OR CONCAT(f_name,' ',l_name) LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (role)   { conditions.push("role = ?"); params.push(role); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const rows = await query<{
      id: number; email: string; f_name: string; l_name: string;
      role: string; created_at: string;
    }[]>(`SELECT id, email, f_name, l_name, role, created_at FROM users ${where} ORDER BY created_at DESC`, params);
    return res.json({ users: rows });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  const id   = Number(req.params.id);
  const role = String(req.body.role ?? "").trim();
  if (isNaN(id) || !["admin", "customer", "sysadmin"].includes(role))
    return res.status(400).json({ message: "Invalid role" });
  if (req.user?.id === id)
    return res.status(400).json({ message: "ไม่สามารถเปลี่ยน role ตัวเองได้" });
  try {
    await execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    return res.json({ message: "Role updated" });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}

// ─── Organizers ───────────────────────────────────────────────────────────────
export async function listOrganizers(req: AuthRequest, res: Response) {
  const search = String(req.query.search ?? "").trim();
  const where  = search ? "WHERE o.name LIKE ? OR u.email LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  try {
    const rows = await query<{
      id: number; name: string; description: string | null;
      logo_url: string | null; owner_name: string; owner_email: string;
      event_count: number; created_at: string;
    }[]>(
      `SELECT o.id, o.name, o.description, o.logo_url, o.created_at,
              CONCAT(u.f_name,' ',u.l_name) AS owner_name, u.email AS owner_email,
              COUNT(e.id) AS event_count
       FROM organizers o
       JOIN users u ON u.id = o.owner_id
       LEFT JOIN events e ON e.organizer_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      params,
    );
    return res.json({ organizers: rows });
  } catch {
    return res.status(500).json({ message: "Error" });
  }
}
