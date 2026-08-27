import type { UserRow, UserRole } from "./types.js";
import { execute, query } from "./query.js";

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(
  fName: string,
  lName: string,
  email: string,
  hashedPassword: string,
): Promise<number> {
  const result = await execute(
    "INSERT INTO users (f_name, l_name, email, password) VALUES (?, ?, ?, ?)",
    [fName, lName, email, hashedPassword],
  );
  return result.insertId;
}
export async function getUserProfile(id: number) {
  const rows = await query<
    (UserRow & {
      organizer_id: number | null;
      is_organizer: number;
      is_staff: number;
    })[]
  >(
    `SELECT
       u.id,
       u.f_name AS firstname,
       u.l_name AS lastname,
       u.email,
       u.role,

       -- Organizer:
       -- organizers.owner_id = users.id
       o.id AS organizer_id,

       CASE
         WHEN o.id IS NOT NULL THEN 1
         ELSE 0
       END AS is_organizer,

       -- Staff:
       -- staff.users_id = users.id
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM staff s
           WHERE s.users_id = u.id
         )
         THEN 1
         ELSE 0
       END AS is_staff

     FROM users u

     LEFT JOIN organizers o
       ON o.owner_id = u.id

     WHERE u.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export interface UserOrganizerRow {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  role: "owner" | "staff" | "manager";
}

export async function getUserOrganizers(userId: number): Promise<UserOrganizerRow[]> {
  // All organizers that the user owns (no limit)
  const owned = await query<UserOrganizerRow[]>(
    `SELECT o.id, o.name, o.description, o.logo_url, 'owner' AS role
     FROM organizers o
     WHERE o.owner_id = ?
     ORDER BY o.created_at ASC`,
    [userId],
  );

  // Organizers where the user is a member (staff/manager) via organizer_members table
  let memberships: UserOrganizerRow[] = [];
  try {
    memberships = await query<UserOrganizerRow[]>(
      `SELECT o.id, o.name, o.description, o.logo_url, om.role
       FROM organizer_members om
       JOIN organizers o ON o.id = om.organizer_id
       WHERE om.user_id = ?`,
      [userId],
    );
  } catch {
    // organizer_members table may not exist yet — return owned only
  }

  return [...owned, ...memberships];
}

export async function updateUser(
  id: number,
  fields: { f_name?: string; l_name?: string; email?: string },
): Promise<void> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return;
  const setClauses = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  await execute(
    `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
    [...values, id],
  );
}
