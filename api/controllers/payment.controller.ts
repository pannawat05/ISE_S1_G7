import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { query, execute } from "../model/query.js";
import Stripe from "stripe";
import type { RowDataPacket } from "mysql2";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

interface ZoneQuery extends RowDataPacket {
  id: number;
  price: number;
  event_id: number;
}

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

    interface SeatId extends RowDataPacket {
      id: number;
    }

    if (seat_ids?.length > 0) {
      const placeholders = seat_ids.map(() => "?").join(",");
      const takenCheck = await query<SeatId[]>(
        `SELECT s.id FROM seats s
         JOIN tickets t ON t.seat_id = s.id
         WHERE s.id IN (${placeholders}) AND s.zone_id = ? AND t.status NOT IN ('cancelled')`,
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

    // 3. Create pending tickets (seat_ids optional)
    const ticketIds: number[] = [];
    if (seat_ids?.length > 0) {
      for (const seatId of seat_ids) {
        const qrcode = `MT-${uuidv4()}`;
        const result = await execute(
          "INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)",
          [qrcode, userId, seatId],
        );
        ticketIds.push(result.insertId);
      }
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
      [
        amount,
        ticketIds[0] ?? null,
        payment_method_id ?? null,
        paymentIntent.id,
      ],
    );

    return res.status(201).json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount,
    });
  } catch (err) {
    console.error(process.env.STRIPE_SECRET_KEY);
    
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

    await execute(
      "UPDATE transactions SET status = 'paid' WHERE bank_ref_no = ?",
      [intent.id],
    );
    interface TicketId extends RowDataPacket {
      ticket_id: number;
    }
    const pendingTickets = await query<TicketId[]>(
      "SELECT ticket_id FROM transactions WHERE bank_ref_no = ?",
      [intent.id],
    );
    const ticketIds = pendingTickets.map((t) => t.ticket_id);

    if (ticketIds.length > 0) {
      const placeholders = ticketIds.map(() => "?").join(",");
      await execute(
        `UPDATE tickets SET status = 'paid' WHERE id IN (${placeholders})`,
        ticketIds,
      );
    }

    return res.json({ message: "ชำระเงินสำเร็จ", status: "paid" });
  } catch (err) {
    console.error("CONFIRM ERROR:", err);
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
}

interface Ticket extends RowDataPacket {
  id: number;
  qrcode: string;
  status: string;
  seat_position: string;
  zone_name: string;
  event_name: string;
}

export async function getMyTickets(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const tickets = await query<[]>(
    `SELECT 
        t.id, 
        t.qrcode, 
        t.status,
        t.created_at,
        s.position AS seat_position,
        z.name AS zone_name,
        z.type AS zone_type,
        z.price AS zone_price,
        e.name AS event_name,
        e.start_date AS event_start,
        e.place_name AS place_name
       FROM tickets t
       LEFT JOIN seats s ON s.id = t.seat_id
       LEFT JOIN zones z ON z.id = s.zone_id
       LEFT JOIN events e ON e.id = z.event_id
       WHERE t.users_id = ? 
       ORDER BY t.id DESC`,
    [userId],
  );

  const withQR = await Promise.all(
    tickets.map(async (t: Ticket) => {
      let qr_data_url = null;
      if (t.status === "paid" || t.status === "checked_in") {
        qr_data_url = await QRCode.toDataURL(
          JSON.stringify({ id: t.id, code: t.qrcode }),
        );
      }
      return { ...t, qr_data_url };
    }),
  );

  return res.json({ tickets: withQR });
}
