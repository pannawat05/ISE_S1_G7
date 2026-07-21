import type { RowDataPacket, ResultSetHeader } from "mysql2";
import db from "./db.js";

export const pool = db.promise();

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function execute(
  sql: string,
  params: any[] = [],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}


