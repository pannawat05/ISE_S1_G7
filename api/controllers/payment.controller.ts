/**
 * payment.controller.ts — Mock Stripe-like payment system
 *
 * Flow:
 *   1. POST /payment/checkout    → validate seats, create pending tickets + transaction
 *                                  → return { session_id, client_secret, amount }
 *   2. POST /payment/confirm     → simulate payment success (Stripe webhook equivalent)
 *                                  → mark tickets paid, generate QR code per ticket
 *                                  → return { tickets: [{ id, seat, qr_data_url }] }
 *   3. GET  /payment/session/:id → poll session status (pending | paid | failed)
 */

import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { query, execute } from "../model/query.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** In-memory session store — replace with Redis in production */
const sessions = new Map<string, {
  userId: number;
  amount: number;
  status: "pending" | "paid" | "failed";
  ticketIds: number[];
  createdAt: number;
}>();

// Clean up sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 30 * 60 * 1000) sessions.delete(id);
  }
}, 5 * 60 * 1000);

async function generateQR(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// ─── POST /payment/checkout ───────────────────────────────────────────────────
export async function checkout(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { event_id, zone_id, seat_ids, payment_method_id } = req.body as {
    event_id: number;
    zone_id: number;
    seat_ids: number[];          // empty = standing zone (no assigned seat)
    payment_method_id?: number;
  };

  if (!event_id || !zone_id) {
    return res.status(400).json({ message: "event_id and zone_id are required" });
  }

  try {
    // 1. Verify zone belongs to event and get price
    const zones = await query<{ id: number; price: number; event_id: number }[]>(
      "SELECT id, price, event_id FROM zones WHERE id = ? AND event_id = ? LIMIT 1",
      [zone_id, event_id],
    );
    if (!zones.length) return res.status(404).json({ message: "Zone not found" });
    const zone = zones[0];

    // 2a. Seat-based booking — verify seats are available
    if (seat_ids?.length > 0) {
      const placeholders = seat_ids.map(() => "?").join(",");
      const takenCheck = await query<{ id: number }[]>(
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
    const amount = Number(zone.price) * qty;

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
    } else {
      // Standing — need a seat placeholder; find any active unbooked seat in zone
      const freeSeat = await query<{ id: number }[]>(
        `SELECT s.id FROM seats s
         LEFT JOIN tickets t ON t.seat_id = s.id AND t.status NOT IN ('cancelled')
         WHERE s.zone_id = ? AND s.is_active = 1 AND t.id IS NULL
         LIMIT 1`,
        [zone_id],
      );
      const targetSeatId = freeSeat[0]?.id ?? null;
      if (!targetSeatId) {
        return res.status(409).json({ message: "ที่นั่งในโซนนี้เต็มแล้ว" });
      }
      const qrcode = `MT-${uuidv4()}`;
      const result = await execute(
        "INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)",
        [qrcode, userId, targetSeatId],
      );
      ticketIds.push(result.insertId);
    }

    // 4. Create pending transaction
    await execute(
      `INSERT INTO transactions (gross_amount, status, ticket_id, payment_method_id)
       VALUES (?, 'pending', ?, ?)`,
      [amount, ticketIds[0], payment_method_id ?? null],
    );

    // 5. Store session
    const sessionId = `cs_mock_${uuidv4().replace(/-/g, "")}`;
    const clientSecret = `pi_mock_${uuidv4().replace(/-/g, "")}_secret_${uuidv4().replace(/-/g, "")}`;
    sessions.set(sessionId, {
      userId, amount, status: "pending", ticketIds, createdAt: Date.now(),
    });

    return res.status(201).json({
      session_id:    sessionId,
      client_secret: clientSecret,
      amount,
      currency:      "THB",
      ticket_count:  ticketIds.length,
      // Mock Stripe publishable key hint
      mock: true,
    });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return res.status(500).json({ message: "Checkout failed" });
  }
}

// ─── POST /payment/confirm ────────────────────────────────────────────────────
export async function confirmPayment(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { session_id, simulate_failure } = req.body as {
    session_id: string;
    simulate_failure?: boolean;   // for testing failure path
  };

  const session = sessions.get(session_id);
  if (!session) return res.status(404).json({ message: "Session not found or expired" });
  if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
  if (session.status !== "pending") {
    return res.status(409).json({ message: `Session already ${session.status}` });
  }

  // Simulate Stripe ~2% failure rate or forced failure
  const failed = simulate_failure === true || Math.random() < 0.02;

  if (failed) {
    // Mark failed
    session.status = "failed";
    // Cancel tickets
    for (const ticketId of session.ticketIds) {
      await execute("UPDATE tickets SET status = 'cancelled' WHERE id = ?", [ticketId]);
      await execute(
        "UPDATE transactions SET status = 'failed' WHERE ticket_id = ? AND status = 'pending'",
        [ticketId],
      );
    }
    return res.status(402).json({
      message: "การชำระเงินไม่สำเร็จ กรุณาลองใหม่",
      session_id,
      status: "failed",
    });
  }

  try {
    session.status = "paid";

    // Mark tickets paid + generate QR
    const results: {
      ticket_id: number;
      qrcode: string;
      qr_data_url: string;
      seat_position: string | null;
    }[] = [];

    for (const ticketId of session.ticketIds) {
      await execute("UPDATE tickets SET status = 'paid' WHERE id = ?", [ticketId]);
      await execute(
        "UPDATE transactions SET status = 'paid', bank_ref_no = ? WHERE ticket_id = ? AND status = 'pending'",
        [`MOCK-${Date.now()}`, ticketId],
      );

      // Fetch ticket details for QR content
      const rows = await query<{
        qrcode: string; seat_position: string | null;
        event_name: string; zone_name: string;
      }[]>(
        `SELECT t.qrcode, s.position AS seat_position,
                e.name AS event_name, z.name AS zone_name
         FROM tickets t
         JOIN seats    s ON s.id    = t.seat_id
         JOIN zones    z ON z.id    = s.zone_id
         JOIN events   e ON e.id    = z.event_id
         WHERE t.id = ? LIMIT 1`,
        [ticketId],
      );

      const info = rows[0];
      if (!info) continue;

      // QR content: JSON payload for check-in scanner
      const qrPayload = JSON.stringify({
        v:     1,
        id:    ticketId,
        code:  info.qrcode,
        seat:  info.seat_position,
        event: info.event_name,
        zone:  info.zone_name,
      });

      const qrDataUrl = await generateQR(qrPayload);

      results.push({
        ticket_id: ticketId,
        qrcode:    info.qrcode,
        qr_data_url: qrDataUrl,
        seat_position: info.seat_position,
      });
    }

    return res.json({
      message: "ชำระเงินสำเร็จ",
      session_id,
      status:  "paid",
      amount:  session.amount,
      tickets: results,
    });
  } catch (err) {
    console.error("CONFIRM PAYMENT ERROR:", err);
    session.status = "failed";
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
}

// ─── GET /payment/session/:id ─────────────────────────────────────────────────
export async function getSession(req: Request, res: Response) {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ message: "Session not found or expired" });
  return res.json({
    session_id: sessionId,
    status:     session.status,
    amount:     session.amount,
    ticket_count: session.ticketIds.length,
  });
}

// ─── GET /payment/my-tickets ──────────────────────────────────────────────────
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
         s.position AS seat_position,
         z.name     AS zone_name,
         z.type     AS zone_type,
         z.price    AS zone_price,
         e.name     AS event_name,
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

    // Generate QR for paid tickets (re-generate on-the-fly — don't store in DB)
    const withQR = await Promise.all(
      tickets.map(async (ticket) => {
        let qr_data_url: string | null = null;
        if (ticket.status === "paid" || ticket.status === "checked_in") {
          const payload = JSON.stringify({
            v: 1, id: ticket.id, code: ticket.qrcode,
            seat: ticket.seat_position, event: ticket.event_name, zone: ticket.zone_name,
          });
          qr_data_url = await generateQR(payload);
        }
        return { ...ticket, qr_data_url };
      }),
    );

    return res.json({ tickets: withQR });
  } catch (err) {
    console.error("MY TICKETS ERROR:", err);
    return res.status(500).json({ message: "Error fetching tickets" });
  }
}
