import type { OrganizerRow } from "./types.js";
import { execute, query } from "./query.js";

export async function findOrganizersByOwnerId(
  ownerId: number,
): Promise<OrganizerRow[]> {
  return query<OrganizerRow[]>(
    `
    SELECT *
    FROM organizers
    WHERE owner_id = ?
    `,
    [ownerId],
  );
}

export async function findOrganizerByOwnerId(
  ownerId: number,
): Promise<OrganizerRow | null> {
  const rows = await query<OrganizerRow[]>(
    `
    SELECT *
    FROM organizers
    WHERE owner_id = ?
    LIMIT 1
    `,
    [ownerId],
  );

  return rows[0] ?? null;
}

export async function findOrganizerById(
  id: number,
): Promise<OrganizerRow | null> {
  const rows = await query<OrganizerRow[]>(
    `
    SELECT *
    FROM organizers
    WHERE id = ?
    LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function createOrganizer(
  name: string,
  logoUrl: string,
  description: string,
  ownerId: number,
  stripeId = "",
): Promise<number> {
  const result = await execute(
    `
    INSERT INTO organizers
      (
        name,
        logo_url,
        description,
        owner_id,
        stripe_id
      )
    VALUES
      (?, ?, ?, ?, ?)
    `,
    [
      name,
      logoUrl,
      description,
      ownerId,
      stripeId,
    ],
  );

  return result.insertId;
}

export async function updateOrganizer(
  id: number,
  fields: {
    name?: string;
    logo_url?: string;
    description?: string;
    stripe_id?: string;
  },
): Promise<void> {
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) {
    return;
  }

  const setClauses = entries
    .map(([key]) => `${key} = ?`)
    .join(", ");

  const values = entries.map(([, value]) => value);

  await execute(
    `
    UPDATE organizers
    SET
      ${setClauses},
      updated_at = NOW()
    WHERE id = ?
    `,
    [
      ...values,
      id,
    ],
  );
}

export async function deleteOrganizer(
  id: number,
): Promise<void> {
  await execute(
    `
    DELETE FROM organizers
    WHERE id = ?
    `,
    [id],
  );
}