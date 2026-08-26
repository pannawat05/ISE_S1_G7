import { query, execute } from "./query.js";

export interface DocumentRow {
  id: number;
  event_id: number;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: number;
  created_at: string;
}

export async function listDocumentsByEvent(eventId: number): Promise<DocumentRow[]> {
  return query<DocumentRow[]>(
    "SELECT id, event_id, name, file_url, file_type, file_size, uploaded_by, created_at FROM event_documents WHERE event_id = ? ORDER BY created_at DESC",
    [eventId],
  );
}

export async function insertDocument(data: {
  event_id: number;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: number;
}): Promise<number> {
  const result = await execute(
    "INSERT INTO event_documents (event_id, name, file_url, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
    [data.event_id, data.name, data.file_url, data.file_type, data.file_size, data.uploaded_by],
  );
  return result.insertId;
}

export async function findDocumentById(id: number): Promise<DocumentRow | null> {
  const rows = await query<DocumentRow[]>(
    "SELECT id, event_id, name, file_url, file_type, file_size, uploaded_by FROM event_documents WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function deleteDocument(id: number): Promise<void> {
  await execute("DELETE FROM event_documents WHERE id = ?", [id]);
}
