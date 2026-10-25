import type { Response } from "express";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import type { AuthRequest } from "../middlewares/types.js";
import { findOrganizerById } from "../model/organizer.model.js";
import { pool, query } from "../model/query.js";
import { fetchGoogleGroupMemberEmails, isValidEmail } from "../lib/googleGroups.js";
import { createInvitationToken, hashInvitationToken } from "../lib/bulkTicketTokens.js";
import { deliverInvitationEmail, deliverPaidTicketEmail } from "../lib/bulkTicketMail.js";

const MAX_GROUP_MEMBERS = 1000;
const INVITATION_DAYS = 7;

interface EventRow extends RowDataPacket {
  id: number;
  name: string;
  start_date: Date;
  place_name: string;
}

interface ExistingTicketRow extends RowDataPacket {
  email: string;
}

interface InvitationRow extends RowDataPacket {
  id: number;
  invited_email: string;
  status: "issued" | "paid" | "cancelled";
  invitation_email_status: "pending" | "sent" | "failed";
  ticket_email_status: "pending" | "sent" | "failed" | null;
  expires_at: Date;
}

interface BatchIdRow extends RowDataPacket {
  id: string;
}

interface PublicInvitationRow extends RowDataPacket {
  invited_email: string;
  event_name: string;
  status: string;
}

interface UserRoleRow extends RowDataPacket {
  role: string;
}

function normalizeGroupEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(",");
}

async function getOwnedEvent(
  req: AuthRequest,
  res: Response,
  organizerId: number,
  eventId: number,
  requireAvailable = true,
): Promise<EventRow | null> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  const organizer = await findOrganizerById(organizerId);
  if (!organizer) {
    res.status(404).json({ message: "Organizer not found" });
    return null;
  }
  if (organizer.owner_id !== userId) {
    const users = await query<UserRoleRow[]>(
      "SELECT role FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    if (users[0]?.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return null;
    }
  }

  const rows = await query<EventRow[]>(
    `SELECT id, name, start_date, place_name
     FROM events
     WHERE id = ? AND organizer_id = ?
       ${requireAvailable ? "AND status = 'approved' AND is_active = 1 AND end_date > NOW()" : ""}
     LIMIT 1`,
    [eventId, organizerId],
  );
  const event = rows[0];
  if (!event) {
    res.status(404).json({ message: "Event not found or ticket sales are unavailable" });
    return null;
  }
  return event;
}

async function getRosterPreview(eventId: number, groupEmail: string) {
  const members = await fetchGoogleGroupMemberEmails(groupEmail);
  if (members.length > MAX_GROUP_MEMBERS) {
    throw new Error(`นำเข้าได้ไม่เกิน ${MAX_GROUP_MEMBERS} สมาชิกต่อ batch`);
  }
  if (!members.length) {
    return { total: 0, duplicateEmails: 0, existingTickets: 0, activeInvitations: 0, members: [] };
  }

  const emails = [...new Set(members.map((email) => email.trim().toLowerCase()).filter(isValidEmail))];
  const existingTickets = await query<ExistingTicketRow[]>(
    `SELECT DISTINCT LOWER(u.email) AS email
     FROM tickets t
     JOIN users u ON u.id = t.users_id
     WHERE t.event_id = ? AND LOWER(u.email) IN (${placeholders(emails.length)})
       AND (
         t.status IN ('paid', 'checked_in')
         OR (t.status = 'reserved' AND t.reserved_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE))
       )`,
    [eventId, ...emails],
  );
  const existingInvitations = await query<InvitationRow[]>(
    `SELECT id, invited_email, status, invitation_email_status,
            ticket_email_status, expires_at
     FROM bulk_ticket_invitations
     WHERE event_id = ? AND invited_email IN (${placeholders(emails.length)})`,
    [eventId, ...emails],
  );
  const ticketEmails = new Set(existingTickets.map((row) => row.email.toLowerCase()));
  const invitationByEmail = new Map(existingInvitations.map((row) => [row.invited_email.toLowerCase(), row]));

  const previewMembers = emails.map((email) => {
    const invitation = invitationByEmail.get(email);
    const hasTicket = ticketEmails.has(email) || invitation?.status === "paid";
    const invitationActive = invitation?.status === "issued" &&
      new Date(invitation.expires_at).getTime() > Date.now() &&
      invitation.invitation_email_status !== "failed";
    return {
      email,
      status: hasTicket
        ? "already_ticketed"
        : invitationActive
          ? "already_invited"
          : "will_invite",
    };
  });

  return {
    total: members.length,
    duplicateEmails: members.length - emails.length,
    existingTickets: previewMembers.filter((member) => member.status === "already_ticketed").length,
    activeInvitations: previewMembers.filter((member) => member.status === "already_invited").length,
    members: previewMembers,
  };
}

async function ownedEventFromParams(req: AuthRequest, res: Response, requireAvailable = true) {
  const organizerId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(organizerId) || organizerId <= 0 ||
      !Number.isInteger(eventId) || eventId <= 0) {
    res.status(400).json({ message: "Invalid organizer or event ID" });
    return null;
  }
  const event = await getOwnedEvent(req, res, organizerId, eventId, requireAvailable);
  return event ? { organizerId, eventId, event } : null;
}

export async function previewGroupMembers(req: AuthRequest, res: Response) {
  try {
    const owned = await ownedEventFromParams(req, res);
    if (!owned) return;
    const groupEmail = normalizeGroupEmail(req.body.group_email);
    if (!isValidEmail(groupEmail)) {
      return res.status(400).json({ message: "กรุณาระบุอีเมล Google Group ที่ถูกต้อง" });
    }
    const preview = await getRosterPreview(owned.eventId, groupEmail);
    return res.json({ group_email: groupEmail, ...preview });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "ไม่สามารถดึงรายชื่อสมาชิกได้",
    });
  }
}

export async function createGroupInvitations(req: AuthRequest, res: Response) {
  const owned = await ownedEventFromParams(req, res);
  if (!owned || !req.user?.id) return;
  const groupEmail = normalizeGroupEmail(req.body.group_email);
  if (!isValidEmail(groupEmail)) {
    return res.status(400).json({ message: "กรุณาระบุอีเมล Google Group ที่ถูกต้อง" });
  }

  try {
    const preview = await getRosterPreview(owned.eventId, groupEmail);
    const inviteEmails = preview.members
      .filter((member) => member.status === "will_invite")
      .map((member) => member.email);
    if (!inviteEmails.length) {
      return res.json({
        batch_id: null,
        total_records: preview.total,
        invitations_created: 0,
        skipped_duplicates: preview.duplicateEmails + preview.existingTickets + preview.activeInvitations,
        email_failures: 0,
        invitations: [],
      });
    }

    const connection = await pool.getConnection();
    const pendingDeliveries: { id: number; token: string }[] = [];
    let batchId: string | null = null;
    let skippedDuplicates = preview.duplicateEmails + preview.existingTickets + preview.activeInvitations;
    try {
      await connection.beginTransaction();
      const [existingRows] = await connection.query<InvitationRow[]>(
        `SELECT id, invited_email, status, invitation_email_status,
                ticket_email_status, expires_at
         FROM bulk_ticket_invitations
         WHERE event_id = ? AND invited_email IN (${placeholders(inviteEmails.length)})
         FOR UPDATE`,
        [owned.eventId, ...inviteEmails],
      );
      const existingByEmail = new Map(
        existingRows.map((invitation) => [invitation.invited_email.toLowerCase(), invitation]),
      );
      const eligibleEmails = inviteEmails.filter((email) => {
        const existing = existingByEmail.get(email);
        const alreadyInvited = existing?.status === "issued" &&
          new Date(existing.expires_at).getTime() > Date.now() &&
          existing.invitation_email_status !== "failed";
        return existing?.status !== "paid" && !alreadyInvited;
      });
      skippedDuplicates += inviteEmails.length - eligibleEmails.length;
      if (!eligibleEmails.length) {
        await connection.rollback();
        return res.json({
          batch_id: null,
          total_records: preview.total,
          invitations_created: 0,
          skipped_duplicates: skippedDuplicates,
          email_failures: 0,
          invitations: [],
        });
      }

      batchId = randomUUID();
      await connection.execute(
        "INSERT INTO bulk_ticket_batches (id, event_id, created_by, group_email) VALUES (?, ?, ?, ?)",
        [batchId, owned.eventId, req.user.id, groupEmail],
      );
      for (const email of eligibleEmails) {
        const token = createInvitationToken();
        const tokenHash = hashInvitationToken(token);
        const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
        const existing = existingByEmail.get(email);
        let invitationId: number;
        if (existing) {
          invitationId = existing.id;
          await connection.execute(
            `UPDATE bulk_ticket_invitations
             SET batch_id = ?, token_hash = ?, status = 'issued',
                 invitation_email_status = 'pending', invitation_email_error = NULL,
                 ticket_email_status = NULL, ticket_email_error = NULL,
                 expires_at = ?
             WHERE id = ?`,
            [batchId, tokenHash, expiresAt, invitationId],
          );
        } else {
          const [result] = await connection.execute(
            `INSERT INTO bulk_ticket_invitations
               (batch_id, event_id, invited_email, token_hash, status,
                invitation_email_status, invitation_email_error, expires_at)
             VALUES (?, ?, ?, ?, 'issued', 'pending', NULL, ?)`,
            [batchId, owned.eventId, email, tokenHash, expiresAt],
          );
          invitationId = (result as { insertId: number }).insertId;
        }
        pendingDeliveries.push({
          id: invitationId,
          token,
        });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    let nextDelivery = 0;
    let failures = 0;
    const workers = Array.from(
      { length: Math.min(5, pendingDeliveries.length) },
      async () => {
        while (nextDelivery < pendingDeliveries.length) {
          const delivery = pendingDeliveries[nextDelivery++];
          if (!delivery) continue;
          if (!await deliverInvitationEmail(delivery.id, delivery.token)) failures++;
        }
      },
    );
    await Promise.all(workers);

    const invitations = await query<InvitationRow[]>(
      `SELECT id, invited_email, status, invitation_email_status,
              ticket_email_status, expires_at
       FROM bulk_ticket_invitations WHERE batch_id = ? ORDER BY id`,
      [batchId],
    );
    return res.status(201).json({
      batch_id: batchId,
      total_records: preview.total,
      invitations_created: pendingDeliveries.length,
      skipped_duplicates: skippedDuplicates,
      email_failures: failures,
      invitations,
    });
  } catch (error) {
    console.error("CREATE BULK TICKET INVITATIONS ERROR:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "ไม่สามารถสร้างคำเชิญได้",
    });
  }
}

export async function getInvitationBatch(req: AuthRequest, res: Response) {
  const owned = await ownedEventFromParams(req, res, false);
  if (!owned) return;
  const batchId = String(req.params.batchId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) {
    return res.status(400).json({ message: "Invalid batch ID" });
  }
  try {
    const batches = await query<BatchIdRow[]>(
      "SELECT id FROM bulk_ticket_batches WHERE id = ? AND event_id = ? LIMIT 1",
      [batchId, owned.eventId],
    );
    if (!batches.length) return res.status(404).json({ message: "Batch not found" });
    const invitations = await query<InvitationRow[]>(
      `SELECT id, invited_email, status, invitation_email_status,
              ticket_email_status, expires_at
       FROM bulk_ticket_invitations WHERE batch_id = ? ORDER BY id`,
      [batchId],
    );
    return res.json({ batch_id: batchId, invitations });
  } catch (error) {
    console.error("GET BULK TICKET BATCH ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถโหลดผล batch ได้" });
  }
}

export async function retryInvitationDelivery(req: AuthRequest, res: Response) {
  const owned = await ownedEventFromParams(req, res, false);
  if (!owned) return;
  const invitationId = Number(req.params.invitationId);
  if (!Number.isInteger(invitationId) || invitationId <= 0) {
    return res.status(400).json({ message: "Invalid invitation ID" });
  }

  try {
    const rows = await query<InvitationRow[]>(
      `SELECT id, invited_email, status, invitation_email_status,
              ticket_email_status, expires_at
       FROM bulk_ticket_invitations WHERE id = ? AND event_id = ? LIMIT 1`,
      [invitationId, owned.eventId],
    );
    const invitation = rows[0];
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });

    let sent: boolean;
    if (invitation.status === "paid" && invitation.ticket_email_status === "failed") {
      sent = await deliverPaidTicketEmail(invitationId);
    } else if (invitation.status === "issued" && invitation.invitation_email_status === "failed") {
      const token = createInvitationToken();
      await pool.execute(
        `UPDATE bulk_ticket_invitations
         SET token_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL ${INVITATION_DAYS} DAY),
             invitation_email_status = 'pending', invitation_email_error = NULL
         WHERE id = ? AND status = 'issued'`,
        [hashInvitationToken(token), invitationId],
      );
      sent = await deliverInvitationEmail(invitationId, token);
    } else {
      return res.status(409).json({ message: "ไม่มีอีเมลที่ล้มเหลวให้ส่งซ้ำ" });
    }
    return res.json({ message: sent ? "ส่งอีเมลสำเร็จ" : "ส่งอีเมลไม่สำเร็จ", sent });
  } catch (error) {
    console.error("RETRY BULK TICKET EMAIL ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถส่งอีเมลซ้ำได้" });
  }
}

export async function validatePublicInvitation(req: AuthRequest, res: Response) {
  const eventId = Number(req.params.eventId);
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!Number.isInteger(eventId) || eventId <= 0 || token.length < 32 || token.length > 128) {
    return res.status(400).json({ message: "Invalid invitation link" });
  }

  res.set("Cache-Control", "private, no-store");
  try {
    const rows = await query<PublicInvitationRow[]>(
      `SELECT i.invited_email, i.status, e.name AS event_name
       FROM bulk_ticket_invitations i
       JOIN events e ON e.id = i.event_id
       WHERE i.event_id = ? AND i.token_hash = ?
         AND i.expires_at > NOW()
         AND e.status = 'approved' AND e.is_active = 1 AND e.end_date > NOW()
       LIMIT 1`,
      [eventId, hashInvitationToken(token)],
    );
    const invitation = rows[0];
    if (!invitation) return res.status(404).json({ message: "Invitation is invalid or expired" });
    if (invitation.status !== "issued") {
      return res.status(409).json({ message: "Invitation has already been used or cancelled" });
    }
    return res.json({
      event_id: eventId,
      event_name: invitation.event_name,
      invited_email: invitation.invited_email,
      status: invitation.status,
    });
  } catch (error) {
    console.error("VALIDATE BULK TICKET INVITATION ERROR:", error);
    return res.status(500).json({ message: "ไม่สามารถตรวจสอบคำเชิญได้" });
  }
}
