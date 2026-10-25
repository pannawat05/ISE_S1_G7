/**
 * whitelist.controller.ts
 * Organizer สามารถเพิ่ม user เข้า white_list ของ event
 * ผู้ที่อยู่ใน whitelist เข้างานได้โดยตรง ไม่ต้องซื้อบัตร
 * (ไม่นับรวมกับ seat stats บน dashboard)
 */

import type { Response } from "express";
import type { RowDataPacket } from "mysql2";
import type { AuthRequest } from "../middlewares/types.js";
import { query, pool } from "../model/query.js";
import { findOrganizerById } from "../model/organizer.model.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { sendOtpEmail } from "../lib/otpMail.js";
import {
  parseGroupWhitelistCsv,
  validateGroupWhitelistRows,
} from "../lib/groupWhitelistCsv.js";

type QueryRow<T> = T & RowDataPacket;

// ─── Guard: verify organizer ownership ───────────────────────────────────────
async function verifyOwner(req: AuthRequest, res: Response, organizerId: number) {
  const organizer = await findOrganizerById(organizerId);
  if (!organizer) { res.status(404).json({ message: "Organizer not found" }); return null; }
  if (organizer.owner_id !== req.user!.id) { res.status(403).json({ message: "Forbidden" }); return null; }
  return organizer;
}

// ─── GET /organizer/:id/events/:eventId/whitelist ─────────────────────────────
export async function listWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<QueryRow<{
      id: number;
      note: string | null;
      users_id: number;
      f_name: string;
      l_name: string;
      email: string;
      added_at: string;
    }>[]>(
      `SELECT wl.id, wl.note, wl.users_id,
              u.f_name, u.l_name, u.email,
              wl.id AS added_at
       FROM white_list wl
       JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ?
       ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({ whitelist: rows });
  } catch (err) {
    console.error("LIST WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error fetching whitelist" });
  }
}

// ─── POST /organizer/:id/events/:eventId/whitelist ────────────────────────────
export async function addToWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });

  const { users_id, note } = req.body as { users_id: number; note?: string };
  if (!users_id || isNaN(Number(users_id))) {
    return res.status(400).json({ message: "users_id is required" });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    // Verify event belongs to organizer
    const eventRows = await query<QueryRow<{ id: number }>[]>(
      "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
      [eventId, organizerId],
    );
    if (!eventRows.length) return res.status(404).json({ message: "Event not found" });

    // Verify target user exists
    const userRows = await query<QueryRow<{ id: number; f_name: string; l_name: string; email: string }>[]>(
      "SELECT id, f_name, l_name, email FROM users WHERE id = ? LIMIT 1",
      [users_id],
    );
    if (!userRows.length) return res.status(404).json({ message: "User not found" });

    // Create the whitelist entry and its no-seat ticket atomically.
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "INSERT INTO white_list (users_id, event_id, note, add_by) VALUES (?, ?, ?, ?)",
        [Number(users_id), eventId, note?.trim() ?? null, req.user.id],
      );
      await connection.execute(
        `INSERT INTO tickets (qrcode, status, users_id, seat_id, event_id, ticket_type, gross_amount, net_amount)
         VALUES (?, 'paid', ?, NULL, ?, 'whitelist', 0, 0)`,
        [`MT-${uuidv4()}`, Number(users_id), eventId],
      );
      await connection.commit();
    } catch (dupErr: unknown) {
      await connection.rollback();
      const code = (dupErr as { code?: string }).code;
      if (code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "User นี้อยู่ใน whitelist แล้ว" });
      }
      throw dupErr;
    } finally {
      connection.release();
    }

    // Return full updated list
    const rows = await query<QueryRow<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
    }>[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email
       FROM white_list wl JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.status(201).json({
      message: `เพิ่ม ${userRows[0]!.f_name} เข้า whitelist สำเร็จ`,
      whitelist: rows,
    });
  } catch (err) {
    console.error("ADD WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error adding to whitelist" });
  }
}

// ─── POST /organizer/:id/events/:eventId/whitelist/import ────────────────────
export async function importGroupWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (!Number.isInteger(organizerId) || !Number.isInteger(eventId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }
  if (
    typeof req.body?.csv !== "string" ||
    Buffer.byteLength(req.body.csv, "utf8") > 80_000
  ) {
    return res.status(400).json({ message: "CSV is required and must be smaller than 80 KB" });
  }

  let rows;
  try {
    rows = validateGroupWhitelistRows(parseGroupWhitelistCsv(req.body.csv));
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Invalid CSV",
    });
  }

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;
    const eventRows = await query<QueryRow<{ id: number }>[]>(
      "SELECT id FROM events WHERE id = ? AND organizer_id = ? LIMIT 1",
      [eventId, organizerId],
    );
    if (!eventRows.length) return res.status(404).json({ message: "Event not found" });

    const results: {
      row: number;
      email: string;
      status: "added" | "already_whitelisted" | "duplicate_import" | "invalid" | "failed";
      account_email?: "sent" | "failed" | "not_needed";
      message?: string;
    }[] = [];
    const seen = new Set<string>();
    let createdAccounts = 0;
    let added = 0;
    let skipped = 0;
    let failed = 0;
    let emailFailures = 0;

    for (const member of rows) {
      if (member.error === "Duplicate email in CSV") {
        results.push({
          row: member.row,
          email: member.email,
          status: "duplicate_import",
          message: member.error,
        });
        skipped++;
        continue;
      }
      if (member.error) {
        results.push({ row: member.row, email: member.email, status: "invalid", message: member.error });
        failed++;
        continue;
      }
      if (seen.has(member.email)) {
        results.push({
          row: member.row,
          email: member.email,
          status: "duplicate_import",
          message: "Duplicate email in CSV",
        });
        skipped++;
        continue;
      }
      seen.add(member.email);

      const connection = await pool.getConnection();
      let newAccount = false;
      try {
        await connection.beginTransaction();
        const [userRows] = await connection.execute(
          "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
          [member.email],
        ) as [{ id: number }[], unknown];
        let userId = userRows[0]?.id;
        if (!userId) {
          const nameParts = member.name.split(/\s+/, 2);
          const firstName = nameParts[0]!;
          const lastName = member.name.slice(firstName.length).trim();
          const temporaryPassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
          const [userResult] = await connection.execute(
            "INSERT INTO users (email, password, f_name, l_name) VALUES (?, ?, ?, ?)",
            [member.email, temporaryPassword, firstName, lastName],
          ) as [{ insertId: number }, unknown];
          userId = userResult.insertId;
          newAccount = true;
        }

        const [whitelistRows] = await connection.execute(
          "SELECT id FROM white_list WHERE users_id = ? AND event_id = ? LIMIT 1",
          [userId, eventId],
        ) as [{ id: number }[], unknown];
        if (whitelistRows.length) {
          await connection.rollback();
          results.push({
            row: member.row,
            email: member.email,
            status: "already_whitelisted",
            account_email: "not_needed",
          });
          skipped++;
          continue;
        }

        await connection.execute(
          "INSERT INTO white_list (users_id, event_id, note, add_by) VALUES (?, ?, ?, ?)",
          [userId, eventId, "Group whitelist import", req.user.id],
        );
        await connection.execute(
          `INSERT INTO tickets (qrcode, status, users_id, seat_id, event_id, ticket_type, gross_amount, net_amount)
           VALUES (?, 'paid', ?, NULL, ?, 'whitelist', 0, 0)`,
          [`MT-${uuidv4()}`, userId, eventId],
        );
        await connection.commit();

        added++;
        if (newAccount) {
          createdAccounts++;
          try {
            await sendOtpEmail(member.email, "account-setup");
            results.push({
              row: member.row,
              email: member.email,
              status: "added",
              account_email: "sent",
            });
          } catch (error) {
            console.error("GROUP WHITELIST ACCOUNT EMAIL ERROR:", error);
            emailFailures++;
            results.push({
              row: member.row,
              email: member.email,
              status: "added",
              account_email: "failed",
              message: "Account created; user can request a password reset from sign-in",
            });
          }
        } else {
          results.push({
            row: member.row,
            email: member.email,
            status: "added",
            account_email: "not_needed",
          });
        }
      } catch (error) {
        await connection.rollback();
        const code = (error as { code?: string }).code;
        if (code === "ER_DUP_ENTRY") {
          const existingWhitelist = await query<QueryRow<{ id: number }>[]>(
            "SELECT id FROM white_list WHERE users_id = (SELECT id FROM users WHERE email = ? LIMIT 1) AND event_id = ? LIMIT 1",
            [member.email, eventId],
          );
          if (existingWhitelist.length) {
            results.push({
              row: member.row,
              email: member.email,
              status: "already_whitelisted",
              account_email: "not_needed",
            });
            skipped++;
          } else {
            results.push({
              row: member.row,
              email: member.email,
              status: "failed",
              message: "Account was created concurrently; retry this import",
            });
            failed++;
          }
        } else {
          console.error("GROUP WHITELIST IMPORT ROW ERROR:", error);
          results.push({
            row: member.row,
            email: member.email,
            status: "failed",
            message: "Could not add this member",
          });
          failed++;
        }
      } finally {
        connection.release();
      }
    }

    const whitelist = await query<QueryRow<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
    }>[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email
       FROM white_list wl JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({
      summary: {
        total: rows.length,
        added,
        createdAccounts,
        skipped,
        failed,
        emailFailures,
      },
      results,
      whitelist,
    });
  } catch (err) {
    console.error("GROUP WHITELIST IMPORT ERROR:", err);
    return res.status(500).json({ message: "Error importing group whitelist" });
  }
}

// ─── DELETE /organizer/:id/events/:eventId/whitelist/:wlId ───────────────────
export async function removeFromWhitelist(req: AuthRequest, res: Response) {
  const organizerId = Number(req.params.id);
  const eventId     = Number(req.params.eventId);
  const wlId        = Number(req.params.wlId);
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (isNaN(organizerId) || isNaN(eventId) || isNaN(wlId)) return res.status(400).json({ message: "Invalid ID" });

  try {
    const organizer = await verifyOwner(req, res, organizerId);
    if (!organizer) return;

    const rows = await query<QueryRow<{ id: number; users_id: number }>[]>(
      "SELECT id, users_id FROM white_list WHERE id = ? AND event_id = ? LIMIT 1",
      [wlId, eventId],
    );
    if (!rows.length) return res.status(404).json({ message: "Whitelist entry not found" });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE tickets
         SET status = 'cancelled'
         WHERE users_id = ? AND event_id = ? AND ticket_type = 'whitelist' AND status = 'paid'`,
        [rows[0]!.users_id, eventId],
      );
      await connection.execute("DELETE FROM white_list WHERE id = ?", [wlId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const updated = await query<QueryRow<{
      id: number; note: string | null; users_id: number;
      f_name: string; l_name: string; email: string;
    }>[]>(
      `SELECT wl.id, wl.note, wl.users_id, u.f_name, u.l_name, u.email
       FROM white_list wl JOIN users u ON u.id = wl.users_id
       WHERE wl.event_id = ? ORDER BY wl.id DESC`,
      [eventId],
    );

    return res.json({ message: "ลบออกจาก whitelist แล้ว", whitelist: updated });
  } catch (err) {
    console.error("REMOVE WHITELIST ERROR:", err);
    return res.status(500).json({ message: "Error removing from whitelist" });
  }
}

// ─── GET /organizer/:id/search-users?q= ──────────────────────────────────────
export async function searchUsers(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return res.json({ users: [] });

  try {
    const users = await query<QueryRow<{ id: number; f_name: string; l_name: string; email: string }>[]>(
      `SELECT id, f_name, l_name, email
       FROM users
       WHERE email LIKE ? OR CONCAT(f_name, ' ', l_name) LIKE ?
       ORDER BY f_name ASC
       LIMIT 15`,
      [`%${q}%`, `%${q}%`],
    );
    return res.json({ users });
  } catch (err) {
    console.error("SEARCH USERS ERROR:", err);
    return res.status(500).json({ message: "Error searching users" });
  }
}
