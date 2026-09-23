import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { getUserProfile, getUserOrganizers, updateUser, findUserByEmail } from "../model/user.model.js";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: profile.id,
      name: `${profile.firstname} ${profile.lastname}`.trim(),
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.email,
      role: profile.role,
    });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyOrganizers(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const organizers = await getUserOrganizers(req.user.id);
    return res.json({ organizers });
  } catch (err) {
    console.error("GET MY ORGANIZERS ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { firstname, lastname, email } = req.body as {
    firstname?: string;
    lastname?: string;
    email?: string;
  };

  const trimmedEmail = email?.trim().toLowerCase();

  // Validate email format if provided
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }

  try {
    // If email is changing, check it's not already taken
    if (trimmedEmail) {
      const existing = await findUserByEmail(trimmedEmail);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    await updateUser(req.user.id, {
      ...(firstname?.trim() ? { f_name: firstname.trim() } : {}),
      ...(lastname?.trim() ? { l_name: lastname.trim() } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    });

    // Fetch updated profile
    const profile = await getUserProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: profile.id,
      name: `${profile.firstname} ${profile.lastname}`.trim(),
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.email,
      role: profile.role,
    });
  } catch (err) {
    console.error("UPDATE ME ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /users/my-staff-assignments ─────────────────────────────────────────
export async function getMyStaffAssignments(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { query } = await import("../model/query.js");

    const assignments = await query<{
      staff_id: number;
      staff_role: string;
      organizer_id: number;
      organizer_name: string;
      organizer_logo: string | null;
      event_id: number | null;
      event_name: string | null;
      event_role: string | null;
      event_status: string | null;
      start_date: string | null;
      end_date: string | null;
      place_name: string | null;
      cover_image: string | null;
      assigned_at: string | null;
    }[]>(
      `SELECT
         s.id           AS staff_id,
         s.role         AS staff_role,
         o.id           AS organizer_id,
         o.name         AS organizer_name,
         o.logo_url     AS organizer_logo,
         e.id           AS event_id,
         e.name         AS event_name,
         es.role        AS event_role,
         e.status       AS event_status,
         e.start_date,
         e.end_date,
         e.place_name,
         e.cover_image,
         es.assigned_at
       FROM staff s
       JOIN organizers o ON o.id = s.organizer_id
       LEFT JOIN event_staff es ON es.staff_id = s.id
       LEFT JOIN events e ON e.id = es.event_id AND e.status != 'deleted'
       WHERE s.users_id = ?
       ORDER BY e.start_date DESC`,
      [req.user.id],
    );

    return res.json({ assignments });
  } catch (err) {
    console.error("MY STAFF ASSIGNMENTS ERROR:", err);
    return res.status(500).json({ message: "Error fetching assignments" });
  }
}

// ─── PATCH /users/me/password ─────────────────────────────────────────────────
export async function changePassword(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };

  if (!current_password || !new_password) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" });
  }

  try {
    const { query, execute } = await import("../model/query.js");
    const bcrypt = await import("bcrypt");

    // ดึง hash ปัจจุบัน
    const rows = await query<{ password: string }[]>(
      "SELECT password FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    // ตรวจสอบ current password
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) {
      return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    // Hash และบันทึกรหัสผ่านใหม่
    const hashed = await bcrypt.hash(new_password, 10);
    await execute("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);

    return res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ message: "เปลี่ยนรหัสผ่านไม่สำเร็จ" });
  }
}
