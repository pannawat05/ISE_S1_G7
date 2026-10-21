import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";

import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import type { RowDataPacket } from "mysql2";

import { query, execute } from "../model/query.js";

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
  };

  if (!event_id || !zone_id) {
    return res.status(400).json({ message: "event_id and zone_id are required" });
  }

  try {
    // ── 1. Get zone + organizer Stripe account ──
    const zones = await query<ZoneQuery[]>(
      `SELECT z.id, z.price, z.event_id, o.stripe_id
       FROM zones z
       JOIN events e ON e.id = z.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE z.id = ? AND z.event_id = ?
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
         JOIN seats s ON s.id = t.seat_id
         JOIN zones z ON z.id = s.zone_id
         WHERE t.users_id = ? AND z.event_id = ?
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

    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      for (const seatId of seat_ids) {
        const qrcode = `MT-${uuidv4()}`;
        const result = await execute(
          `INSERT INTO tickets (qrcode, status, users_id, seat_id, reserved_at) VALUES (?, 'reserved', ?, ?, NOW())`,
          [qrcode, userId, seatId],
        );
        ticketIds.push(result.insertId);
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

      const qrcode = `MT-${uuidv4()}`;
      const result = await execute(
        `INSERT INTO tickets (qrcode, status, users_id, seat_id, reserved_at) VALUES (?, 'reserved', ?, ?, NOW())`,
        [qrcode, userId, freeSeat[0].id],
      );
      ticketIds.push(result.insertId);
    }

    // ── 7. Free ticket shortcut — ข้าม Stripe ──
    if (amountSatang === 0) {
      const placeholders = ticketIds.map(() => "?").join(",");
      await execute(
        `UPDATE tickets SET status = 'paid', gross_amount = 0, net_amount = 0
         WHERE id IN (${placeholders}) AND status = 'reserved'`,
        ticketIds,
      );

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
        },
      },
      { stripeAccount: stripeAccountId },
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
    // ── 1. Get organizer stripe_id from any reserved ticket of this user ──
    const anyTicket = await query<{ id: number; stripe_id: string }[]>(
      `SELECT t.id, o.stripe_id
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = z.event_id
       JOIN organizers o ON o.id = e.organizer_id
       WHERE t.users_id = ? AND t.status = 'reserved'
       ORDER BY t.id DESC
       LIMIT 1`,
      [userId],
    );

    if (!anyTicket.length || !anyTicket[0].stripe_id) {
      return res.status(404).json({ message: "ไม่พบตั๋วที่รอชำระเงิน" });
    }

    const stripeAccountId = anyTicket[0].stripe_id.trim();

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
    const ticketRows = await query<{ id: number; qrcode: string; position: string | null }[]>(
      `SELECT t.id, t.qrcode, s.position
       FROM tickets t
       LEFT JOIN seats s ON s.id = t.seat_id
       WHERE t.id IN (${placeholders}) AND t.users_id = ?`,
      [...metaTicketIds, userId],
    );

    if (!ticketRows.length) {
      return res.status(404).json({ message: "ไม่พบตั๋ว" });
    }

    if (paymentIntent.status !== "succeeded") {
      // Cancel reserved tickets
      await execute(
        `UPDATE tickets SET status = 'cancelled' WHERE id IN (${placeholders})`,
        metaTicketIds,
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

    await execute(
      `UPDATE tickets SET status = 'paid', payment_intent_id = ?, gross_amount = ?, net_amount = ?
       WHERE id IN (${placeholders}) AND status = 'reserved'`,
      [payment_intent_id, perTicketGross, perTicketNet, ...metaTicketIds],
    );

    // ── 5. Generate QR codes ──
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
         s.position AS seat_position,
         z.name AS zone_name, z.type AS zone_type, z.price AS zone_price,
         e.name AS event_name, e.start_date AS event_start, e.end_date AS event_end, e.place_name
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = z.event_id
       WHERE t.users_id = ? AND t.status != 'cancelled'
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
