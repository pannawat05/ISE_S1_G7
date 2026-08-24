// Shared nodemailer transporter and email helpers
// All controllers that send email should import from here.
// @ts-expect-error nodemailer has no bundled types
import nodemailer from "nodemailer";
import { query } from "../model/query.js";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Fetch event owner info ───────────────────────────────────────────────────
async function getEventOwner(
  eventId: number,
): Promise<{ email: string; f_name: string; event_name: string } | null> {
  const rows = await query<{ email: string; f_name: string; event_name: string }[]>(
    `SELECT u.email, u.f_name, e.name AS event_name
     FROM events e
     JOIN organizers o ON o.id = e.organizer_id
     JOIN users      u ON u.id = o.owner_id
     WHERE e.id = ? LIMIT 1`,
    [eventId],
  );
  return rows[0] ?? null;
}

// ─── Notify owner when event is approved ─────────────────────────────────────
export async function notifyEventApproved(eventId: number): Promise<void> {
  const owner = await getEventOwner(eventId);
  if (!owner) return;

  const { email, f_name, event_name } = owner;
  await transporter
    .sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `✅ กิจกรรม "${event_name}" ได้รับการอนุมัติแล้ว`,
      html: `
        <p>เรียน คุณ${f_name},</p>
        <p>กิจกรรม <strong>${event_name}</strong> ของคุณได้รับการอนุมัติแล้ว
           และจะแสดงบนหน้าเว็บไซต์ Magic Ticket เรียบร้อย</p>
        <p>ขอบคุณที่ใช้บริการ Magic Ticket</p>
      `.trim(),
    })
    .catch((e: unknown) => console.error("Email send error:", e));
}

// ─── Notify owner when event is rejected ─────────────────────────────────────
export async function notifyEventRejected(eventId: number, note: string): Promise<void> {
  const owner = await getEventOwner(eventId);
  if (!owner) return;

  const { email, f_name, event_name } = owner;
  await transporter
    .sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `❌ กิจกรรม "${event_name}" ไม่ผ่านการอนุมัติ`,
      html: `
        <p>เรียน คุณ${f_name},</p>
        <p>กิจกรรม <strong>${event_name}</strong> ของคุณไม่ผ่านการอนุมัติ</p>
        <p><strong>เหตุผล:</strong> ${note}</p>
        <p>หากต้องการแก้ไขและส่งใหม่ กรุณาเข้าสู่ระบบและแก้ไขข้อมูลกิจกรรมของคุณ</p>
        <p>ขอบคุณที่ใช้บริการ Magic Ticket</p>
      `.trim(),
    })
    .catch((e: unknown) => console.error("Email send error:", e));
}
