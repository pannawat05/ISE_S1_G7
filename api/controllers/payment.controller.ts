import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";

import QRCode from "qrcode";
import Stripe from "stripe";
import type { RowDataPacket } from "mysql2";

import { pool, query, execute } from "../model/query.js";
import { hashInvitationToken } from "../lib/bulkTicketTokens.js";
import { createTicketQrCode } from "../lib/ticketCodes.js";
import { deliverPaidTicketEmail } from "../lib/bulkTicketMail.js";

// ============================================================
// Stripe
// ============================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// ============================================================
// Platform fee
// ============================================================

const DEFAULT_PLATFORM_FEE_PERCENT = 10;
const DEFAULT_BOOKING_LIMIT = 5;
const RESERVATION_MINUTES = 5;

async function getPlatformFeePercent(): Promise<number> {
  try {
    const rows = await query<{ setting_value: number }[]>(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'platform_fee_percent' LIMIT 1",
    );
    const value = Number(rows[0]?.setting_value);
    return Number.isFinite(value) && value >= 0 && value <= 100
      ? value
      : DEFAULT_PLATFORM_FEE_PERCENT;
  } catch {
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }
}

async function getBookingLimit(): Promise<number> {
  try {
    const rows = await query<{ setting_value: number }[]>(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'booking_limit' LIMIT 1",
    );
    const value = Math.floor(Number(rows[0]?.setting_value));
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_BOOKING_LIMIT;
  } catch {
    return DEFAULT_BOOKING_LIMIT;
  }
}

// ============================================================
// Types
// ============================================================

interface ZoneQuery extends RowDataPacket {
  id: number;
  price: number;
  event_id: number;
  stripe_id: string | null;
}

interface SeatId extends RowDataPacket {
  id: number;
}

interface EventBookingAccess extends RowDataPacket {
  whitelist_enabled: boolean | number;
  is_whitelisted: number;
  has_invitation: number;
}

interface InvitationCheckoutRow extends RowDataPacket {
  id: number;
  ticket_id: number | null;
  ticket_status: string | null;
  reserved_at: Date | null;
}

interface PaymentIntentTicketAccountRow extends RowDataPacket {
  id: number;
  stripe_id: string | null;
}

interface ConfirmPaymentTicketRow extends RowDataPacket {
  id: number;
  qrcode: string;
  position: string | null;
  status: string;
  payment_intent_id: string | null;
  bulk_invitation_id: number | null;
}

interface BulkInvitationStatusRow extends RowDataPacket {
  status: string;
}

interface OrganizerQuery extends RowDataPacket {
  id: number;
  email: string;
  stripe_id: string | null;
}

// ============================================================
// ORGANIZER STRIPE GENERATOR (Express Method)
// ============================================================

export async function setupOrganizerStripe(req: AuthRequest, res: Response) {
  const organizerId = req.user?.id;
  if (!organizerId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const organizers = await query<OrganizerQuery[]>(
      `SELECT id, email, stripe_id FROM organizers WHERE id = ? LIMIT 1`,
      [organizerId],
    );

    if (!organizers.length) return res.status(404).json({ message: "Organizer not found" });

    const organizer = organizers[0];
    let stripeAccountId = organizer?.stripe_id?.trim();

    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
      const account = await stripe.accounts.create({
        type: "express",
        email: organizer?.email || "",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await execute(`UPDATE organizers SET stripe_id = ? WHERE id = ?`, [stripeAccountId, organizerId]);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/return`,
      type: "account_onboarding",
    });

    return res.status(200).json({
      stripe_account_id: stripeAccountId,
      onboarding_url: accountLink.url,
    });
  } catch (error: any) {
    console.error("Stripe Connection Setup Failed:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// ============================================================
// CHECKOUT
// ============================================================

export async function checkout(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { event_id, zone_id, seat_ids } = req.body as {
    event_id: number;
    zone_id: number;
    seat_ids: number[];
    bulk_invitation_token?: string;
  };
  const invitationToken = req.body.bulk_invitation_token;

  if (!event_id || !zone_id) {
    return res.status(400).json({ message: "event_id and zone_id are required" });
  }
  if (invitationToken && Array.isArray(seat_ids) && seat_ids.length !== 1) {
    return res.status(400).json({ message: "คำเชิญนี้ใช้ซื้อบัตรได้ 1 ใบเท่านั้น" });
  }

  try {
    // ── 0. Check whitelist if enabled ──
    const eventAccess = await query<EventBookingAccess[]>(
      `SELECT e.whitelist_enabled,
              EXISTS (
                SELECT 1
                FROM white_list wl
                WHERE wl.event_id = e.id AND wl.users_id = ?
              ) AS is_whitelisted,
              EXISTS (
                SELECT 1
                FROM bulk_ticket_invitations i
                JOIN users u ON LOWER(u.email) = LOWER(i.invited_email)
                WHERE i.event_id = e.id AND i.token_hash = ?
                  AND i.status = 'issued' AND i.expires_at > NOW()
                  AND u.id = ?
              ) AS has_invitation
       FROM events e
       WHERE e.id = ? AND e.status = 'approved'
         AND e.is_active = 1 AND e.end_date > NOW()
       LIMIT 1`,
      [userId, invitationToken ? hashInvitationToken(invitationToken) : "", userId, event_id],
    );
    const access = eventAccess[0];
    if (!access) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (invitationToken && !access.has_invitation) {
      return res.status(403).json({ message: "คำเชิญนี้ไม่ถูกต้อง หมดอายุ หรือไม่ได้ส่งถึงบัญชีนี้" });
    }
    if (!invitationToken && access.whitelist_enabled && !access.is_whitelisted) {
      return res.status(403).json({ message: "คุณไม่อยู่ในรายชื่อผู้มีสิทธิ์ซื้อตั๋วงานนี้" });
    }

    let bulkInvitationId: number | null = null;
    let reusableTicketId: number | null = null;
    if (invitationToken) {
      const invitations = await query<InvitationCheckoutRow[]>(
        `SELECT i.id, t.id AS ticket_id, t.status AS ticket_status, t.reserved_at
         FROM bulk_ticket_invitations i
         LEFT JOIN tickets t ON t.bulk_invitation_id = i.id
         WHERE i.event_id = ? AND i.token_hash = ? AND i.status = 'issued'
           AND i.expires_at > NOW()
         LIMIT 1`,
        [event_id, hashInvitationToken(invitationToken)],
      );
      const invitation = invitations[0];
      if (!invitation) {
        return res.status(403).json({ message: "คำเชิญนี้ถูกใช้แล้วหรือหมดอายุ" });
      }
      bulkInvitationId = invitation.id;
      if (invitation.ticket_status === "paid" || invitation.ticket_status === "checked_in") {
        return res.status(409).json({ message: "คำเชิญนี้ถูกใช้ซื้อบัตรแล้ว" });
      }
      if (invitation.ticket_status === "reserved" && invitation.reserved_at &&
          new Date(invitation.reserved_at).getTime() > Date.now() - RESERVATION_MINUTES * 60_000) {
        return res.status(409).json({ message: "มีการชำระเงินที่กำลังดำเนินการสำหรับคำเชิญนี้" });
      }
      reusableTicketId = invitation.ticket_id;
    }

    // ── 1. Get zone + organizer Stripe account ──
    const zones = await query<ZoneQuery[]>(
      `SELECT z.id, z.price, z.event_id, o.stripe_id
       FROM zones z
       JOIN events e ON e.id = z.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE z.id = ? AND z.event_id = ?
         AND e.status = 'approved' AND e.is_active = 1 AND e.end_date > NOW()
       LIMIT 1`,
      [zone_id, event_id],
    );

    if (!zones.length) return res.status(404).json({ message: "Zone not found" });

    const zone = zones[0];

    // ── 2. Validate Organizer Stripe Account ──
    const stripeAccountId = zone?.stripe_id?.trim();
    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
      return res.status(400).json({ message: "ผู้จัดงานยังไม่ได้เชื่อมต่อ Stripe" });
    }

    // ── 3. Check only selected seats are taken ──
    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      const placeholders = seat_ids.map(() => "?").join(",");
      const takenCheck = await query<SeatId[]>(
        `SELECT s.id
         FROM seats s
         JOIN tickets t ON t.seat_id = s.id
         WHERE s.id IN (${placeholders})
           AND s.zone_id = ?
           AND (
             t.status IN ('paid', 'checked_in')
             OR (t.status = 'reserved' AND t.reserved_at > DATE_SUB(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE))
           )`,
        [...seat_ids, zone_id],
      );

      if (takenCheck.length > 0) {
        return res.status(409).json({
          message: "บางที่นั่งถูกจองแล้ว",
          taken_seat_ids: takenCheck.map((r) => r.id),
        });
      }
    }

    // ── 4. Calculate amount ──
    const qty = Array.isArray(seat_ids) && seat_ids.length > 0 ? seat_ids.length : 1;

    // ── 4.1 Booking limit check ──
    const bookingLimit = await getBookingLimit();
    if (bookingLimit > 0) {
      const ownedRows = await query<{ cnt: number }[]>(
        `SELECT COUNT(t.id) AS cnt
         FROM tickets t
         WHERE t.users_id = ? AND t.event_id = ?
           AND (
             t.status IN ('paid', 'checked_in')
             OR (t.status = 'reserved' AND t.reserved_at > DATE_SUB(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE))
           )`,
        [userId, Number(event_id)],
      );
      const alreadyOwned = Number(ownedRows[0]?.cnt ?? 0);
      if (alreadyOwned + qty > bookingLimit) {
        return res.status(409).json({
          message: `จองได้สูงสุด ${bookingLimit} บัตรต่อคนต่อ 1 งาน (คุณมีบัตรในงานนี้แล้ว ${alreadyOwned} ใบ)`,
        });
      }
    }

    const amount = Number(zone.price) * qty;
    const amountSatang = Math.round(amount * 100);

    // ── 5. Platform fee ──
    const platformFeePercent = await getPlatformFeePercent();
    const applicationFeeSatang = Math.round(amountSatang * (platformFeePercent / 100));

    // ── 6. Reserve ONLY the selected seats ──
    const ticketIds: number[] = [];
    async function reserveTicket(seatId: number) {
      const qrcode = createTicketQrCode();
      if (reusableTicketId !== null) {
        const result = await execute(
          `UPDATE tickets
           SET qrcode = ?, status = 'reserved', users_id = ?, seat_id = ?,
               event_id = ?, reserved_at = NOW(), payment_intent_id = NULL
           WHERE id = ? AND (
             status = 'cancelled'
             OR (status = 'reserved' AND reserved_at <= DATE_SUB(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE))
           )`,
          [qrcode, userId, seatId, Number(event_id), reusableTicketId],
        );
        if (result.affectedRows !== 1) throw new Error("คำเชิญนี้ไม่สามารถเริ่ม checkout ใหม่ได้");
        ticketIds.push(reusableTicketId);
        return;
      }
      const result = await execute(
        `INSERT INTO tickets
           (qrcode, status, users_id, seat_id, event_id, reserved_at${bulkInvitationId === null ? "" : ", bulk_invitation_id"})
         VALUES (?, 'reserved', ?, ?, ?, NOW()${bulkInvitationId === null ? "" : ", ?"})`,
        bulkInvitationId === null
          ? [qrcode, userId, seatId, Number(event_id)]
          : [qrcode, userId, seatId, Number(event_id), bulkInvitationId],
      );
      ticketIds.push(result.insertId);
    }

    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      for (const seatId of seat_ids) {
        await reserveTicket(seatId);
      }
    } else {
      // Standing zone — pick one free seat
      const freeSeat = await query<{ id: number }[]>(
        `SELECT s.id
         FROM seats s
         LEFT JOIN tickets t ON t.seat_id = s.id
           AND (
             t.status IN ('paid', 'checked_in')
             OR (t.status = 'reserved' AND t.reserved_at > DATE_SUB(NOW(), INTERVAL ${RESERVATION_MINUTES} MINUTE))
           )
         WHERE s.zone_id = ? AND s.is_active = 1 AND t.id IS NULL
         LIMIT 1`,
        [zone_id],
      );

      if (!freeSeat[0]) return res.status(409).json({ message: "ที่นั่งในโซนนี้เต็มแล้ว" });

      await reserveTicket(freeSeat[0].id);
    }

    // ── 7. Free ticket shortcut — ข้าม Stripe ──
    if (amountSatang === 0) {
      const placeholders = ticketIds.map(() => "?").join(",");
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `UPDATE tickets SET status = 'paid', gross_amount = 0, net_amount = 0
           WHERE id IN (${placeholders}) AND status = 'reserved'`,
          ticketIds,
        );
        if (bulkInvitationId !== null) {
          await connection.execute(
            "UPDATE bulk_ticket_invitations SET status = 'paid', ticket_email_status = 'pending' WHERE id = ? AND status = 'issued'",
            [bulkInvitationId],
          );
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      if (bulkInvitationId !== null) await deliverPaidTicketEmail(bulkInvitationId);

      const ticketRows = await query<{ id: number; qrcode: string; position: string | null }[]>(
        `SELECT t.id, t.qrcode, s.position
         FROM tickets t
         LEFT JOIN seats s ON s.id = t.seat_id
         WHERE t.id IN (${placeholders})`,
        ticketIds,
      );

      const tickets = [];
      for (const ticket of ticketRows) {
        const qrDataUrl = await QRCode.toDataURL(ticket.qrcode);
        tickets.push({
          ticket_id: ticket.id,
          qrcode: ticket.qrcode,
          qr_data_url: qrDataUrl,
          seat_position: ticket.position,
        });
      }

      return res.status(200).json({
        is_free: true,
        amount: 0,
        ticket_ids: ticketIds,
        tickets,
        message: "จองบัตรฟรีสำเร็จ",
      });
    }

    // ── 8. Create PaymentIntent ──
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountSatang,
        currency: "thb",
        application_fee_amount: applicationFeeSatang,
        metadata: {
          userId: String(userId),
          eventId: String(event_id),
          ticketIds: ticketIds.join(","),
          ...(bulkInvitationId === null ? {} : { bulkInvitationId: String(bulkInvitationId) }),
        },
      },
      { stripeAccount: stripeAccountId },
    );
    await execute(
      `UPDATE tickets SET payment_intent_id = ? WHERE id IN (${ticketIds.map(() => "?").join(",")}) AND status = 'reserved'`,
      [paymentIntent.id, ...ticketIds],
    );

    // ── 9. Return response matching frontend CheckoutResponse type ──
    return res.status(200).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
      stripe_account_id: stripeAccountId,
      platform_fee_percent: platformFeePercent,
      ticket_ids: ticketIds,
    });
  } catch (error: any) {
    console.error("Checkout processing failed:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// ============================================================
// CONFIRM PAYMENT
// ============================================================

export async function confirmPayment(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { payment_intent_id } = req.body as { payment_intent_id: string };
  if (!payment_intent_id) return res.status(400).json({ message: "payment_intent_id is required" });

  try {
    // ── 1. Resolve the Stripe account from this exact PaymentIntent ──
    const anyTicket = await query<PaymentIntentTicketAccountRow[]>(
      `SELECT t.id, o.stripe_id
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = z.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE t.users_id = ? AND t.payment_intent_id = ?
         AND t.status IN ('reserved', 'paid')
       ORDER BY t.id DESC
       LIMIT 1`,
      [userId, payment_intent_id],
    );

    const paymentAccountTicket = anyTicket[0];
    if (!paymentAccountTicket?.stripe_id) {
      return res.status(404).json({ message: "ไม่พบตั๋วที่รอชำระเงิน" });
    }

    const stripeAccountId = paymentAccountTicket.stripe_id.trim();

    // ── 2. Verify PaymentIntent with Stripe ──
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        payment_intent_id, {}, { stripeAccount: stripeAccountId },
      );
    } catch {
      return res.status(400).json({ message: "ไม่พบ PaymentIntent" });
    }

    // ── 3. Get ticket IDs from PaymentIntent metadata ──
    const metaTicketIds = (paymentIntent.metadata?.ticketIds ?? "")
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    if (!metaTicketIds.length) {
      return res.status(400).json({ message: "ไม่พบข้อมูลตั๋วใน PaymentIntent" });
    }

    const placeholders = metaTicketIds.map(() => "?").join(",");
    const ticketRows = await query<ConfirmPaymentTicketRow[]>(
      `SELECT t.id, t.qrcode, s.position, t.status, t.payment_intent_id,
              t.bulk_invitation_id
       FROM tickets t
       LEFT JOIN seats s ON s.id = t.seat_id
       WHERE t.id IN (${placeholders}) AND t.users_id = ?`,
      [...metaTicketIds, userId],
    );

    if (!ticketRows.length ||
        ticketRows.length !== metaTicketIds.length ||
        ticketRows.some((ticket) =>
          ticket.payment_intent_id !== payment_intent_id ||
          !["reserved", "paid"].includes(ticket.status)
        ) ||
        Number(paymentIntent.metadata?.userId) !== userId) {
      return res.status(404).json({ message: "ไม่พบตั๋ว" });
    }

    const bulkInvitationId = Number(paymentIntent.metadata?.bulkInvitationId) || null;
    if (bulkInvitationId !== null) {
      if (ticketRows.length !== 1 ||
          ticketRows[0]?.bulk_invitation_id !== bulkInvitationId ||
          ticketRows[0]?.payment_intent_id !== payment_intent_id ||
          !["reserved", "paid"].includes(ticketRows[0]?.status ?? "")) {
        return res.status(409).json({ message: "คำเชิญหรือรายการจองนี้ไม่ถูกต้องแล้ว" });
      }
    }

    if (paymentIntent.status !== "succeeded") {
      // Cancel reserved tickets
      await execute(
        `UPDATE tickets SET status = 'cancelled'
         WHERE id IN (${placeholders}) AND users_id = ?
           AND payment_intent_id = ? AND status = 'reserved'`,
        [...metaTicketIds, userId, payment_intent_id],
      );
      return res.status(400).json({ message: "การชำระเงินไม่สำเร็จ", status: "failed" });
    }

    // ── 4. Update tickets to paid + store payment info ──
    // Retrieve charge details from Stripe to get actual net amount
    let grossAmount: number | null = null;
    let netAmount: number | null = null;

    try {
      const charges = paymentIntent.latest_charge
        ? [await stripe.charges.retrieve(
            paymentIntent.latest_charge as string,
            { expand: ["balance_transaction"] },
            { stripeAccount: stripeAccountId },
          )]
        : (await stripe.charges.list(
            { payment_intent: payment_intent_id, limit: 1, expand: ["data.balance_transaction"] },
            { stripeAccount: stripeAccountId },
          )).data;

      const charge = charges[0];
      if (charge) {
        const grossSatang = charge.amount;
        const appFeeSatang = charge.application_fee_amount ?? 0;
        const bt = charge.balance_transaction as { fee?: number } | null;
        const stripeFee = bt?.fee ?? 0;
        grossAmount = grossSatang / 100;
        netAmount = (grossSatang - appFeeSatang - stripeFee) / 100;
      }
    } catch (err) {
      console.error("Failed to retrieve Stripe charge for net amount:", err);
    }

    // Distribute gross/net evenly across tickets
    const perTicketGross = grossAmount !== null ? Math.round((grossAmount / ticketRows.length) * 100) / 100 : null;
    const perTicketNet = netAmount !== null ? Math.round((netAmount / ticketRows.length) * 100) / 100 : null;

    const connection = await pool.getConnection();
    let confirmedTicketRows: ConfirmPaymentTicketRow[] = [];
    try {
      await connection.beginTransaction();
      const [lockedTickets] = await connection.query<ConfirmPaymentTicketRow[]>(
        `SELECT t.id, t.qrcode, s.position, t.status, t.payment_intent_id,
                t.bulk_invitation_id
         FROM tickets t
         LEFT JOIN seats s ON s.id = t.seat_id
         WHERE t.id IN (${placeholders}) AND t.users_id = ?
         FOR UPDATE`,
        [...metaTicketIds, userId],
      );
      if (
        lockedTickets.length !== metaTicketIds.length ||
        lockedTickets.some((ticket) =>
          ticket.payment_intent_id !== payment_intent_id ||
          !["reserved", "paid"].includes(ticket.status)
        ) ||
        (bulkInvitationId !== null && (
          lockedTickets.length !== 1 ||
          lockedTickets[0]?.bulk_invitation_id !== bulkInvitationId
        ))
      ) {
        await connection.rollback();
        return res.status(409).json({ message: "รายการจองนี้หมดอายุหรือถูกเปลี่ยนแปลงแล้ว" });
      }
      confirmedTicketRows = lockedTickets;
      await connection.execute(
        `UPDATE tickets SET status = 'paid', payment_intent_id = ?, gross_amount = ?, net_amount = ?
         WHERE id IN (${placeholders}) AND users_id = ?
           AND payment_intent_id = ? AND status = 'reserved'`,
        [payment_intent_id, perTicketGross, perTicketNet, ...metaTicketIds, userId, payment_intent_id],
      );
      if (bulkInvitationId !== null) {
        const [invitations] = await connection.query<BulkInvitationStatusRow[]>(
          "SELECT status FROM bulk_ticket_invitations WHERE id = ? FOR UPDATE",
          [bulkInvitationId],
        );
        if (!invitations[0] || !["issued", "paid"].includes(invitations[0].status)) {
          await connection.rollback();
          return res.status(409).json({ message: "คำเชิญนี้ถูกยกเลิกหรือใช้ไปแล้ว" });
        }
        await connection.execute(
          `UPDATE bulk_ticket_invitations
           SET status = 'paid', ticket_email_status = 'pending'
           WHERE id = ? AND status = 'issued'`,
          [bulkInvitationId],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    if (bulkInvitationId !== null) await deliverPaidTicketEmail(bulkInvitationId);

    // ── 5. Generate QR codes ──
    const tickets = [];
    for (const ticket of confirmedTicketRows) {
      const qrDataUrl = await QRCode.toDataURL(ticket.qrcode);
      tickets.push({
        ticket_id: ticket.id,
        qrcode: ticket.qrcode,
        qr_data_url: qrDataUrl,
        seat_position: ticket.position,
      });
    }

    return res.json({ message: "ชำระเงินสำเร็จ", status: "paid", payment_intent_id, tickets });
  } catch (error: any) {
    console.error("Confirm payment failed:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// ============================================================
// CANCEL PAYMENT
// ============================================================

export async function cancelPayment(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { ticket_ids } = req.body as { ticket_ids: number[] };
  if (!Array.isArray(ticket_ids) || !ticket_ids.length) {
    return res.status(400).json({ message: "ticket_ids are required" });
  }

  try {
    // Cancel only tickets owned by this user that are still reserved
    const placeholders = ticket_ids.map(() => "?").join(",");
    const result = await execute(
      `UPDATE tickets SET status = 'cancelled'
       WHERE id IN (${placeholders}) AND users_id = ? AND status = 'reserved'`,
      [...ticket_ids, userId],
    );

    return res.json({ message: "ยกเลิกการจองแล้ว", cancelled: result.affectedRows });
  } catch (error: any) {
    console.error("Cancel payment failed:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// ============================================================
// MY TICKETS
// ============================================================

export async function getMyTickets(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const tickets = await query<{
      id: number; qrcode: string; status: string; created_at: string;
      seat_position: string | null; zone_name: string; zone_type: string;
      zone_price: number; event_name: string; event_start: string; event_end: string; place_name: string;
    }[]>(
      `SELECT
         t.id, t.qrcode, t.status, t.created_at,
         COALESCE(s.position, 'WL-00') AS seat_position,
         COALESCE(z.name, 'Whitelist') AS zone_name,
         COALESCE(z.type, 'whitelist') AS zone_type,
         COALESCE(z.price, 0) AS zone_price,
         e.name AS event_name, e.start_date AS event_start, e.end_date AS event_end, e.place_name
       FROM tickets t
       LEFT JOIN seats s ON s.id = t.seat_id
       LEFT JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = t.event_id
       WHERE t.users_id = ?
       ORDER BY t.created_at DESC`,
      [userId],
    );

    // Generate QR data URLs for paid/checked_in tickets
    const result = [];
    for (const ticket of tickets) {
      let qr_data_url: string | null = null;
      if (ticket.status === "paid" || ticket.status === "checked_in") {
        try { qr_data_url = await QRCode.toDataURL(ticket.qrcode); } catch { /* skip */ }
      }
      result.push({ ...ticket, zone_price: Number(ticket.zone_price), qr_data_url });
    }

    return res.json({ tickets: result });
  } catch (error: any) {
    console.error("Get my tickets failed:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}
