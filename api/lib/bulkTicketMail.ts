import QRCode from "qrcode";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "../model/query.js";
import { transporter } from "./mailer.js";

interface InvitationMailRow extends RowDataPacket {
  id: number;
  event_id: number;
  invited_email: string;
  event_name: string;
  start_date: Date;
  place_name: string;
  status: string;
}

interface TicketMailRow extends InvitationMailRow {
  ticket_id: number;
  qrcode: string;
  seat_position: string;
  ticket_email_status: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

async function sendInvitationEmail(invitationId: number, token: string): Promise<boolean> {
  const rows = await query<InvitationMailRow[]>(
    `SELECT i.id, i.event_id, i.invited_email, i.status, e.name AS event_name,
            e.start_date, e.place_name
     FROM bulk_ticket_invitations i
     JOIN events e ON e.id = i.event_id
     WHERE i.id = ? AND i.status = 'issued' AND i.expires_at > NOW()
     LIMIT 1`,
    [invitationId],
  );
  const invitation = rows[0];
  if (!invitation) throw new Error("Invitation is no longer available");

  const eventDate = new Date(invitation.start_date).toLocaleString("th-TH");
  const origin = process.env.FRONTEND_URL;
  if (!origin) throw new Error("Frontend URL is not configured");
  const paymentUrl = `${origin.replace(/\/$/, "")}/events/${invitation.event_id}?ticket_invite=${encodeURIComponent(token)}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: invitation.invited_email,
      subject: `คำเชิญซื้อบัตร: ${invitation.event_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
          <h2>Magic Ticket</h2>
          <p>คุณได้รับคำเชิญสำหรับ <strong>${escapeHtml(invitation.event_name)}</strong></p>
          <p>วันเวลา: ${escapeHtml(eventDate)}<br>สถานที่: ${escapeHtml(invitation.place_name)}</p>
          <p>ลิงก์นี้ใช้สำหรับซื้อบัตร 1 ใบด้วยอีเมลที่ได้รับคำเชิญ และหมดอายุใน 7 วัน</p>
          <p><a href="${escapeHtml(paymentUrl)}">เลือกโซนและชำระเงิน</a></p>
          <p>บัตรและ QR code จะส่งให้หลังชำระเงินสำเร็จเท่านั้น</p>
        </div>
      `,
    });
    await execute(
      "UPDATE bulk_ticket_invitations SET invitation_email_status = 'sent', invitation_email_error = NULL WHERE id = ?",
      [invitationId],
    );
    return true;
  } catch {
    await execute(
      "UPDATE bulk_ticket_invitations SET invitation_email_status = 'failed', invitation_email_error = 'Email delivery failed' WHERE id = ?",
      [invitationId],
    );
    return false;
  }
}

async function sendTicketEmail(invitationId: number): Promise<boolean> {
  const rows = await query<TicketMailRow[]>(
    `SELECT i.id, i.event_id, i.invited_email, i.status, i.ticket_email_status, e.name AS event_name,
            e.start_date, e.place_name, t.id AS ticket_id, t.qrcode,
            COALESCE(s.position, 'ยืน') AS seat_position
     FROM bulk_ticket_invitations i
     JOIN events e ON e.id = i.event_id
     JOIN tickets t ON t.bulk_invitation_id = i.id AND t.status IN ('paid', 'checked_in')
     LEFT JOIN seats s ON s.id = t.seat_id
     WHERE i.id = ? AND i.status = 'paid'
     LIMIT 1`,
    [invitationId],
  );
  const ticket = rows[0];
  if (!ticket) throw new Error("Paid invitation ticket was not found");
  if (ticket.ticket_email_status === "sent") return true;

  try {
    const qr = await QRCode.toBuffer(ticket.qrcode, { type: "png", width: 320, margin: 1 });
    const eventDate = new Date(ticket.start_date).toLocaleString("th-TH");
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: ticket.invited_email,
      subject: `บัตรของคุณ: ${ticket.event_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
          <h2>Magic Ticket</h2>
          <p>สวัสดี ${escapeHtml(ticket.invited_email)}, ชำระเงินสำหรับ <strong>${escapeHtml(ticket.event_name)}</strong> สำเร็จแล้ว</p>
          <p>หมายเลขบัตร: <strong>${ticket.ticket_id}</strong><br>ที่นั่ง: ${escapeHtml(ticket.seat_position)}<br>
          วันเวลา: ${escapeHtml(eventDate)}<br>สถานที่: ${escapeHtml(ticket.place_name)}</p>
          <p>กรุณาแสดง QR code นี้ที่ทางเข้างาน</p>
          <img src="cid:ticket-qr-${ticket.ticket_id}" alt="Ticket QR code" width="320" height="320">
        </div>
      `,
      attachments: [{ filename: `ticket-${ticket.ticket_id}.png`, content: qr, cid: `ticket-qr-${ticket.ticket_id}` }],
    });
    await execute(
      "UPDATE bulk_ticket_invitations SET ticket_email_status = 'sent', ticket_email_error = NULL WHERE id = ?",
      [invitationId],
    );
    return true;
  } catch {
    await execute(
      "UPDATE bulk_ticket_invitations SET ticket_email_status = 'failed', ticket_email_error = 'Email delivery failed' WHERE id = ?",
      [invitationId],
    );
    return false;
  }
}

export async function deliverInvitationEmail(invitationId: number, token: string): Promise<boolean> {
  return sendInvitationEmail(invitationId, token);
}

export async function deliverPaidTicketEmail(invitationId: number): Promise<boolean> {
  return sendTicketEmail(invitationId);
}
