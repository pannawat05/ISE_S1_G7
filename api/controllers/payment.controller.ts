import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { query, execute } from "../model/query.js";
import Stripe from "stripe";
import type { RowDataPacket } from "mysql2";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

interface ZoneQuery extends RowDataPacket { id: number; price: number; event_id: number; }
interface SeatId   extends RowDataPacket { id: number; }

export async function checkout(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { event_id, zone_id, seat_ids, payment_method_id } = req.body as {
    event_id: number;
    zone_id: number;
    seat_ids: number[];
    payment_method_id?: number;
  };

  if (!event_id || !zone_id) {
    return res
      .status(400)
      .json({ message: "event_id and zone_id are required" });
  }

  try {
    // 1. Verify zone belongs to event and get price
    const zones = await query<ZoneQuery[]>(
      "SELECT id, price, event_id FROM zones WHERE id = ? AND event_id = ? LIMIT 1",
      [zone_id, event_id],
    );
    if (!zones.length)
      return res.status(404).json({ message: "Zone not found" });
    const zone = zones[0];

    if (seat_ids?.length > 0) {
      const placeholders = seat_ids.map(() => "?").join(",");
      const takenCheck = await query<SeatId[]>(
        `SELECT s.id FROM seats s
         JOIN tickets t ON t.seat_id = s.id
         WHERE s.id IN (${placeholders}) AND s.zone_id = ?
         AND t.status NOT IN ('cancelled', 'reserved')`,
        [...seat_ids, zone_id],
      );
      if (takenCheck.length > 0) {
        const takenIds = takenCheck.map((r) => r.id);
        return res.status(409).json({
          message: "บางที่นั่งถูกจองแล้ว",
          taken_seat_ids: takenIds,
        });
      }
    }

    // 2b. Standing zone — just count, no seat assignment
    const qty = seat_ids?.length > 0 ? seat_ids.length : 1;
    const amount = Number(zone?.price) * qty;

    // 3. Create reserved tickets
    const ticketIds: number[] = [];
    if (seat_ids?.length > 0) {
      // Seat-based booking
      for (const seatId of seat_ids) {
        const qrcode = `MT-${uuidv4()}`;
        const result = await execute(
          "INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)",
          [qrcode, userId, seatId],
        );
        ticketIds.push(result.insertId);
      }
    } else {
      // Standing zone — find any free active seat
      const freeSeat = await query<{ id: number }[]>(
        `SELECT s.id FROM seats s
         LEFT JOIN tickets t ON t.seat_id = s.id AND t.status NOT IN ('cancelled')
         WHERE s.zone_id = ? AND s.is_active = 1 AND t.id IS NULL
         LIMIT 1`,
        [zone_id],
      );
      if (!freeSeat[0]) {
        return res.status(409).json({ message: "ที่นั่งในโซนนี้เต็มแล้ว" });
      }
      const qrcode = `MT-${uuidv4()}`;
      const result = await execute(
        "INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)",
        [qrcode, userId, freeSeat[0].id],
      );
      ticketIds.push(result.insertId);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "thb",
      metadata: {
        userId: String(userId),
        ticketIds: JSON.stringify(ticketIds),
      },
    });

    await execute(
      `INSERT INTO transactions (gross_amount, status, ticket_id, payment_method_id, bank_ref_no)
       VALUES (?, 'pending', ?, ?, ?)`,
      [amount, ticketIds[0] ?? null, payment_method_id ?? null, paymentIntent.id],
    );

    return res.status(201).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
    });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return res.status(500).json({ message: "Checkout failed" });
  }
}

export async function confirmPayment(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { payment_intent_id, paymentIntentId } = req.body;
  const intentId = payment_intent_id || paymentIntentId;

  if (!intentId) {
    return res.status(400).json({ message: "payment_intent_id is required" });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.status !== "succeeded") {
      return res.status(400).json({ message: "การชำระเงินยังไม่สมบูรณ์" });
    }

    // ticketIds stored in metadata during checkout
    const ticketIds: number[] = JSON.parse(intent.metadata?.ticketIds ?? "[]");

    // Mark transaction paid
    await execute(
      "UPDATE transactions SET status = 'paid' WHERE bank_ref_no = ? AND status = 'pending'",
      [intent.id],
    );

    // Mark all tickets paid + generate QR per ticket
    const results: {
      ticket_id: number;
      qrcode: string;
      qr_data_url: string;
      seat_position: string | null;
    }[] = [];

    for (const ticketId of ticketIds) {
      await execute("UPDATE tickets SET status = 'paid' WHERE id = ?", [ticketId]);

      const rows = await query<{
        qrcode: string;
        seat_position: string | null;
        event_name: string;
        zone_name: string;
      }[]>(
        `SELECT t.qrcode, s.position AS seat_position,
                e.name AS event_name, z.name AS zone_name
         FROM tickets t
         JOIN seats  s ON s.id = t.seat_id
         JOIN zones  z ON z.id = s.zone_id
         JOIN events e ON e.id = z.event_id
         WHERE t.id = ? LIMIT 1`,
        [ticketId],
      );

      const info = rows[0];
      if (!info) continue;

      const qrDataUrl = await QRCode.toDataURL(
        JSON.stringify({
          v: 1,
          id: ticketId,
          code: info.qrcode,
          seat: info.seat_position,
          event: info.event_name,
          zone: info.zone_name,
        }),
        { errorCorrectionLevel: "H", margin: 2, width: 300 },
      );

      results.push({
        ticket_id: ticketId,
        qrcode: info.qrcode,
        qr_data_url: qrDataUrl,
        seat_position: info.seat_position,
      });
    }

    return res.json({
      message: "ชำระเงินสำเร็จ",
      status: "paid",
      tickets: results,
    });
  } catch (err) {
    console.error("CONFIRM ERROR:", err);
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
}

export async function getMyTickets(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const tickets = await query<{
      id: number; qrcode: string; status: string; created_at: string;
      seat_position: string; zone_name: string; zone_type: string; zone_price: number;
      event_name: string; event_start: string; place_name: string;
    }[]>(
      `SELECT
         t.id, t.qrcode, t.status, t.created_at,
         s.position   AS seat_position,
         z.name       AS zone_name,
         z.type       AS zone_type,
         z.price      AS zone_price,
         e.name       AS event_name,
         e.start_date AS event_start,
         e.place_name
       FROM tickets t
       JOIN seats  s ON s.id  = t.seat_id
       JOIN zones  z ON z.id  = s.zone_id
       JOIN events e ON e.id  = z.event_id
       WHERE t.users_id = ?
       ORDER BY t.created_at DESC`,
      [userId],
    );

    const withQR = await Promise.all(
      tickets.map(async (t) => {
        let qr_data_url: string | null = null;
        if (t.status === "paid" || t.status === "checked_in") {
          qr_data_url = await QRCode.toDataURL(
            JSON.stringify({
              v: 1,
              id: t.id,
              code: t.qrcode,
              seat: t.seat_position,
              event: t.event_name,
              zone: t.zone_name,
            }),
            { errorCorrectionLevel: "H", margin: 2, width: 300 },
          );
        }
        return { ...t, qr_data_url };
      }),
    );

    return res.json({ tickets: withQR });
  } catch (err) {
    console.error("MY TICKETS ERROR:", err);
    return res.status(500).json({ message: "Error fetching tickets" });
  }
}
