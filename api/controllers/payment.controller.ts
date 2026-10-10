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

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || ""
);


// ============================================================
// Platform fee
// ============================================================

const PLATFORM_FEE_PERCENT = 10;


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

export async function setupOrganizerStripe(
  req: AuthRequest,
  res: Response
) {
  // Assuming req.user contains the authenticated organizer details
  const organizerId = req.user?.id; 

  if (!organizerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // 1. Fetch current organizer details from MySQL
    const organizers = await query<OrganizerQuery[]>(
      `SELECT id, email, stripe_id FROM organizers WHERE id = ? LIMIT 1`,
      [organizerId]
    );

    if (!organizers.length) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const organizer = organizers[0];
    let stripeAccountId = organizer.stripe_id?.trim();

    // 2. If they don't have a Stripe Account ID yet, auto-generate one
    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
      const account = await stripe.accounts.create({
        type: "express",
        email: organizer.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Persist the newly generated Account ID to the database immediately
      await execute(
        `UPDATE organizers SET stripe_id = ? WHERE id = ?`,
        [stripeAccountId, organizerId]
      );
    }

    // 3. Generate a single-use onboarding URL for the Express account
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`, // Link fallback if it expires
      return_url: `${process.env.FRONTEND_URL}/stripe/return`,   // Success callback destination
      type: "account_onboarding",
    });

    // 4. Return the onboarding link to the client app
    return res.status(200).json({
      stripe_account_id: stripeAccountId,
      onboarding_url: accountLink.url,
    });

  } catch (error: any) {
    console.error("Stripe Connection Setup Failed:", error);
    return res.status(500).json({
      message: "Internal Server Error during Stripe onboarding creation",
      error: error.message,
    });
  }
}


// ============================================================
// CHECKOUT
// ============================================================

export async function checkout(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const {
    event_id,
    zone_id,
    seat_ids,
  } = req.body as {
    event_id: number;
    zone_id: number;
    seat_ids: number[];
  };

  // ----------------------------------------------------------
  // Validate input
  // ----------------------------------------------------------

  if (!event_id || !zone_id) {
    return res.status(400).json({
      message: "event_id and zone_id are required",
    });
  }

  try {

    // ========================================================
    // 1. Get zone + organizer Stripe account
    // ========================================================

    const zones = await query<ZoneQuery[]>(
      `
      SELECT
        z.id,
        z.price,
        z.event_id,
        o.stripe_id
      FROM zones z
      JOIN events e ON e.id = z.event_id
      JOIN organizers o ON o.id = e.organizer_id
      WHERE z.id = ? AND z.event_id = ?
      LIMIT 1
      `,
      [zone_id, event_id]
    );

    if (!zones.length) {
      return res.status(404).json({
        message: "Zone not found",
      });
    }

    const zone = zones[0];

    // ========================================================
    // 2. Validate Organizer Stripe Account
    // ========================================================

    const stripeAccountId = zone.stripe_id?.trim();

    if (!stripeAccountId || !stripeAccountId.startsWith("acct_")) {
      return res.status(400).json({
        message: "ผู้จัดงานยังไม่ได้เชื่อมต่อ Stripe",
      });
    }

    // ========================================================
    // 3. Check seats
    // ========================================================

    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      const placeholders = seat_ids.map(() => "?").join(",");

      const takenCheck = await query<SeatId[]>(
        `
        SELECT s.id
        FROM seats s
        JOIN tickets t ON t.seat_id = s.id
        WHERE s.id IN (${placeholders})
          AND s.zone_id = ?
          AND t.status IN ('reserved', 'paid', 'checked_in')
        `,
        [...seat_ids, zone_id]
      );

      if (takenCheck.length > 0) {
        const takenIds = takenCheck.map((row) => row.id);
        return res.status(409).json({
          message: "บางที่นั่งถูกจองแล้ว",
          taken_seat_ids: takenIds,
        });
      }
    }

    // ========================================================
    // 4. Calculate amount
    // ========================================================

    const qty = Array.isArray(seat_ids) && seat_ids.length > 0 ? seat_ids.length : 1;
    const amount = Number(zone.price) * qty;
    const amountSatang = Math.round(amount * 100);

    // ========================================================
    // 5. Calculate platform fee
    // ========================================================

    const applicationFeeSatang = Math.round(
      amountSatang * (PLATFORM_FEE_PERCENT / 100)
    );

    // ========================================================
    // 6. Create reserved tickets
    // ========================================================

    const ticketIds: number[] = [];

    if (Array.isArray(seat_ids) && seat_ids.length > 0) {
      for (const seatId of seat_ids) {
        const qrcode = `MT-${uuidv4()}`;
        const result = await execute(
          `INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)`,
          [qrcode, userId, seatId]
        );
        ticketIds.push(result.insertId);
      }
    } else {
      // Standing zone logic
      const freeSeat = await query<{ id: number }[]>(
        `
        SELECT s.id
        FROM seats s
        LEFT JOIN tickets t ON t.seat_id = s.id AND t.status IN ('reserved', 'paid', 'checked_in')
        WHERE s.zone_id = ? AND s.is_active = 1 AND t.id IS NULL
        LIMIT 1
        `,
        [zone_id]
      );

      if (!freeSeat[0]) {
        return res.status(409).json({
          message: "ที่นั่งในโซนนี้เต็มแล้ว",
        });
      }

      const qrcode = `MT-${uuidv4()}`;
      const result = await execute(
        `INSERT INTO tickets (qrcode, status, users_id, seat_id) VALUES (?, 'reserved', ?, ?)`,
        [qrcode, userId, freeSeat[0].id]
      );
      ticketIds.push(result.insertId);
    }

    // ========================================================
    // 7. Create PaymentIntent (Fixed & Completed)
    // ========================================================

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
      {
        stripeAccount: stripeAccountId, // Routes the payment directly to the connected organizer
      }
    );

    // 8. Return the client secret to the frontend to mount the payment form
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      ticketIds: ticketIds,
    });

  } catch (error: any) {
    console.error("Checkout processing failed:", error);
    return res.status(500).json({
      message: "Internal Server Error during checkout routing",
      error: error.message,
    });
  }
}
