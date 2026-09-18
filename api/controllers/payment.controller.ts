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

interface TicketInfo extends RowDataPacket {
  qrcode: string;
  seat_position: string | null;
  event_name: string;
  zone_name: string;
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
    payment_method_id,
  } = req.body as {
    event_id: number;
    zone_id: number;
    seat_ids: number[];
    payment_method_id?: number;
  };


  // ----------------------------------------------------------
  // Validate input
  // ----------------------------------------------------------

  if (!event_id || !zone_id) {
    return res.status(400).json({
      message:
        "event_id and zone_id are required",
    });
  }


  try {

    // ========================================================
    // 1. Get zone + organizer Stripe account
    // ========================================================

    const zones =
      await query<ZoneQuery[]>(
        `
        SELECT
          z.id,
          z.price,
          z.event_id,
          o.stripe_id
        FROM zones z
        JOIN events e
          ON e.id = z.event_id
        JOIN organizers o
          ON o.id = e.organizer_id
        WHERE z.id = ?
          AND z.event_id = ?
        LIMIT 1
        `,
        [
          zone_id,
          event_id,
        ]
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

    const stripeAccountId =
      zone.stripe_id?.trim();


    if (
      !stripeAccountId ||
      !stripeAccountId.startsWith("acct_")
    ) {
      return res.status(400).json({
        message:
          "ผู้จัดงานยังไม่ได้เชื่อมต่อ Stripe",
      });
    }


    // ========================================================
    // 3. Check seats
    // ========================================================

    if (
      Array.isArray(seat_ids) &&
      seat_ids.length > 0
    ) {

      const placeholders =
        seat_ids
          .map(() => "?")
          .join(",");


      /*
       * IMPORTANT
       *
       * reserved / paid / checked_in
       * ถือว่าที่นั่งถูกใช้งานแล้ว
       *
       * cancelled เท่านั้นที่สามารถกลับมาใช้ได้
       */

      const takenCheck =
        await query<SeatId[]>(
          `
          SELECT s.id
          FROM seats s
          JOIN tickets t
            ON t.seat_id = s.id
          WHERE s.id IN (${placeholders})
            AND s.zone_id = ?
            AND t.status IN (
              'reserved',
              'paid',
              'checked_in'
            )
          `,
          [
            ...seat_ids,
            zone_id,
          ]
        );


      if (takenCheck.length > 0) {

        const takenIds =
          takenCheck.map(
            (row) => row.id
          );


        return res.status(409).json({
          message:
            "บางที่นั่งถูกจองแล้ว",
          taken_seat_ids:
            takenIds,
        });
      }
    }


    // ========================================================
    // 4. Calculate amount
    // ========================================================

    const qty =
      Array.isArray(seat_ids) &&
      seat_ids.length > 0
        ? seat_ids.length
        : 1;


    const amount =
      Number(zone.price) * qty;


    const amountSatang =
      Math.round(amount * 100);


    // ========================================================
    // 5. Calculate platform fee
    // ========================================================

    const applicationFeeSatang =
      Math.round(
        amountSatang *
          (PLATFORM_FEE_PERCENT / 100)
      );


    // ========================================================
    // 6. Create reserved tickets
    // ========================================================

    const ticketIds: number[] = [];


    // --------------------------------------------------------
    // Seat-based booking
    // --------------------------------------------------------

    if (
      Array.isArray(seat_ids) &&
      seat_ids.length > 0
    ) {

      for (const seatId of seat_ids) {

        const qrcode =
          `MT-${uuidv4()}`;


        const result =
          await execute(
            `
            INSERT INTO tickets
              (
                qrcode,
                status,
                users_id,
                seat_id
              )
            VALUES
              (
                ?,
                'reserved',
                ?,
                ?
              )
            `,
            [
              qrcode,
              userId,
              seatId,
            ]
          );


        ticketIds.push(
          result.insertId
        );
      }

    } else {

      // ======================================================
      // Standing zone
      // ======================================================

      const freeSeat =
        await query<{ id: number }[]>(
          `
          SELECT s.id
          FROM seats s
          LEFT JOIN tickets t
            ON t.seat_id = s.id
            AND t.status IN (
              'reserved',
              'paid',
              'checked_in'
            )
          WHERE s.zone_id = ?
            AND s.is_active = 1
            AND t.id IS NULL
          LIMIT 1
          `,
          [zone_id]
        );


      if (!freeSeat[0]) {
        return res.status(409).json({
          message:
            "ที่นั่งในโซนนี้เต็มแล้ว",
        });
      }


      const qrcode =
        `MT-${uuidv4()}`;


      const result =
        await execute(
          `
          INSERT INTO tickets
            (
              qrcode,
              status,
              users_id,
              seat_id
            )
          VALUES
            (
              ?,
              'reserved',
              ?,
              ?
            )
          `,
          [
            qrcode,
            userId,
            freeSeat[0].id,
          ]
        );


      ticketIds.push(
        result.insertId
      );
    }


    // ========================================================
    // 7. Create PaymentIntent
    //
    // IMPORTANT:
    //
    // PaymentIntent belongs to the Organizer's
    // Connected Account.
    //
    // Platform receives application_fee_amount.
    // ========================================================

    const paymentIntent =
      await stripe.paymentIntents.create(
        {
          amount: amountSatang,

          currency: "thb",

          // 10% goes to platform
          application_fee_amount:
            applicationFeeSatang,

          metadata: {
            userId: String(userId),

            eventId:
              String(event_id),

            zoneId:
              String(zone_id),

            ticketIds:
              JSON.stringify(ticketIds),

            stripeAccountId:
              stripeAccountId,

            platformFeePercent:
              String(
                PLATFORM_FEE_PERCENT
              ),

            platformFeeAmount:
              String(
                applicationFeeSatang
              ),
          },
        },

        // IMPORTANT:
        // Create PaymentIntent on connected account
        {
          stripeAccount:
            stripeAccountId,
        }
      );


    // ========================================================
    // 8. Create transaction
    // ========================================================

    await execute(
      `
      INSERT INTO transactions
        (
          gross_amount,
          gateway_fee,
          status,
          ticket_id,
          payment_method_id,
          bank_ref_no
        )
      VALUES
        (
          ?,
          ?,
          'pending',
          ?,
          ?,
          ?
        )
      `,
      [
        amount,

        /*
         * Existing database has gateway_fee.
         * We store platform fee here for now.
         *
         * If later you want exact Stripe processing
         * fee separately, add another column.
         */
        applicationFeeSatang / 100,

        ticketIds[0],

        payment_method_id ?? null,

        paymentIntent.id,
      ]
    );


    // ========================================================
    // 9. Return to frontend
    // ========================================================

    return res.status(201).json({

      client_secret:
        paymentIntent.client_secret,

      payment_intent_id:
        paymentIntent.id,

      amount,

      stripe_account_id:
        stripeAccountId,

      platform_fee:
        applicationFeeSatang / 100,

      platform_fee_percent:
        PLATFORM_FEE_PERCENT,

      ticket_ids:
        ticketIds,
    });


  } catch (err) {

    console.error(
      "CHECKOUT ERROR:",
      err
    );


    return res.status(500).json({
      message:
        "Checkout failed",
    });
  }
}


// ============================================================
// CONFIRM PAYMENT
// ============================================================

export async function confirmPayment(
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
    payment_intent_id,
    paymentIntentId,
  } = req.body;


  const intentId =
    payment_intent_id ||
    paymentIntentId;


  if (!intentId) {
    return res.status(400).json({
      message:
        "payment_intent_id is required",
    });
  }


  try {

    // ========================================================
    // 1. Retrieve PaymentIntent from PLATFORM first
    //
    // We need metadata.stripeAccountId to know which
    // connected account owns this PaymentIntent.
    //
    // HOWEVER:
    // PaymentIntent created by checkout is on connected
    // account, so Stripe platform cannot retrieve it
    // directly.
    //
    // Therefore we find the organizer account using
    // transaction/ticket information.
    // ========================================================


    // --------------------------------------------------------
    // Find transaction + organizer using payment intent ID
    // --------------------------------------------------------

    const transactionRows =
      await query<{
        ticket_id: number;
        stripe_id: string;
        users_id: number;
      }[]>(
        `
        SELECT
          t.ticket_id,
          o.stripe_id,
          tk.users_id
        FROM transactions t
        JOIN tickets tk
          ON tk.id = t.ticket_id
        JOIN seats s
          ON s.id = tk.seat_id
        JOIN zones z
          ON z.id = s.zone_id
        JOIN events e
          ON e.id = z.event_id
        JOIN organizers o
          ON o.id = e.organizer_id
        WHERE t.bank_ref_no = ?
        LIMIT 1
        `,
        [intentId]
      );


    if (!transactionRows.length) {
      return res.status(404).json({
        message:
          "ไม่พบรายการชำระเงิน",
      });
    }


    const transaction =
      transactionRows[0];


    // --------------------------------------------------------
    // Security: ticket must belong to current user
    // --------------------------------------------------------

    if (
      Number(transaction.users_id) !==
      Number(userId)
    ) {
      return res.status(403).json({
        message:
          "ไม่มีสิทธิ์เข้าถึงรายการชำระเงินนี้",
      });
    }


    const stripeAccountId =
      transaction.stripe_id?.trim();


    if (
      !stripeAccountId ||
      !stripeAccountId.startsWith("acct_")
    ) {
      return res.status(400).json({
        message:
          "ไม่พบ Stripe Connected Account",
      });
    }


    // ========================================================
    // 2. Retrieve PaymentIntent from SAME connected account
    // ========================================================

    const intent =
      await stripe.paymentIntents.retrieve(
        intentId,
        {},
        {
          stripeAccount:
            stripeAccountId,
        }
      );


    // ========================================================
    // 3. Verify payment succeeded
    // ========================================================

    if (
      intent.status !== "succeeded"
    ) {
      return res.status(400).json({
        message:
          "การชำระเงินยังไม่สมบูรณ์",
        status:
          intent.status,
      });
    }


    // ========================================================
    // 4. Get ticket IDs from metadata
    //
    // THIS IS THE SAME IMPORTANT BETA2 FLOW
    // ========================================================

    let ticketIds: number[] = [];


    try {

      ticketIds =
        JSON.parse(
          intent.metadata?.ticketIds ??
            "[]"
        );

    } catch {

      ticketIds = [];
    }


    if (!Array.isArray(ticketIds)) {
      ticketIds = [];
    }


    // ========================================================
    // Safety:
    // If metadata doesn't contain ticket IDs,
    // use transaction ticket as fallback.
    // ========================================================

    if (ticketIds.length === 0) {

      ticketIds = [
        transaction.ticket_id,
      ];
    }


    // ========================================================
    // 5. Mark transaction paid
    // ========================================================

    await execute(
      `
      UPDATE transactions
      SET status = 'paid'
      WHERE bank_ref_no = ?
        AND status = 'pending'
      `,
      [intent.id]
    );


    // ========================================================
    // 6. Mark tickets paid + generate QR
    //
    // THIS PART IS PRESERVED FROM BETA2
    // ========================================================

    const results: {
      ticket_id: number;
      qrcode: string;
      qr_data_url: string;
      seat_position: string | null;
    }[] = [];


    for (
      const ticketId of ticketIds
    ) {

      // ------------------------------------------------------
      // Security: only update current user's ticket
      // ------------------------------------------------------

      await execute(
        `
        UPDATE tickets
        SET status = 'paid'
        WHERE id = ?
          AND users_id = ?
        `,
        [
          ticketId,
          userId,
        ]
      );


      // ------------------------------------------------------
      // Get ticket information
      // ------------------------------------------------------

      const rows =
        await query<TicketInfo[]>(
          `
          SELECT
            t.qrcode,
            s.position AS seat_position,
            e.name AS event_name,
            z.name AS zone_name
          FROM tickets t

          JOIN seats s
            ON s.id = t.seat_id

          JOIN zones z
            ON z.id = s.zone_id

          JOIN events e
            ON e.id = z.event_id

          WHERE t.id = ?
            AND t.users_id = ?

          LIMIT 1
          `,
          [
            ticketId,
            userId,
          ]
        );


      const info =
        rows[0];


      if (!info) {
        console.warn(
          "Ticket not found:",
          ticketId
        );

        continue;
      }


      // ------------------------------------------------------
      // Generate QR
      // ------------------------------------------------------

      const qrDataUrl =
        await QRCode.toDataURL(

          JSON.stringify({
            v: 1,

            id:
              ticketId,

            code:
              info.qrcode,

            seat:
              info.seat_position,

            event:
              info.event_name,

            zone:
              info.zone_name,
          }),

          {
            errorCorrectionLevel:
              "H",

            margin: 2,

            width: 300,
          }
        );


      // ------------------------------------------------------
      // Add ticket to response
      // ------------------------------------------------------

      results.push({

        ticket_id:
          ticketId,

        qrcode:
          info.qrcode,

        qr_data_url:
          qrDataUrl,

        seat_position:
          info.seat_position,
      });
    }


    // ========================================================
    // 7. Return tickets
    // ========================================================

    console.log(
      "CONFIRM PAYMENT:",
      {
        intentId,
        stripeAccountId,
        userId,
        ticketIds,
        ticketCount:
          results.length,
      }
    );


    return res.json({

      message:
        "ชำระเงินสำเร็จ",

      status:
        "paid",

      tickets:
        results,
    });


  } catch (err) {

    console.error(
      "CONFIRM ERROR:",
      err
    );


    return res.status(500).json({
      message:
        "Payment confirmation failed",
    });
  }
}


// ============================================================
// GET MY TICKETS
// ============================================================

export async function getMyTickets(
  req: AuthRequest,
  res: Response
) {

  const userId = req.user?.id;


  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }


  try {

    const tickets =
      await query<{
        id: number;
        qrcode: string;
        status: string;
        created_at: string;

        seat_position: string;

        zone_name: string;
        zone_type: string;
        zone_price: number;

        event_name: string;
        event_start: string;
        place_name: string;
      }[]>(
        `
        SELECT
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
          e.place_name

        FROM tickets t

        JOIN seats s
          ON s.id = t.seat_id

        JOIN zones z
          ON z.id = s.zone_id

        JOIN events e
          ON e.id = z.event_id

        WHERE t.users_id = ?

        ORDER BY
          t.created_at DESC
        `,
        [userId]
      );


    // ========================================================
    // Generate QR for paid tickets
    // ========================================================

    const withQR =
      await Promise.all(

        tickets.map(
          async (t) => {

            let qr_data_url:
              string | null = null;


            if (
              t.status === "paid" ||
              t.status === "checked_in"
            ) {

              qr_data_url =
                await QRCode.toDataURL(

                  JSON.stringify({
                    v: 1,

                    id:
                      t.id,

                    code:
                      t.qrcode,

                    seat:
                      t.seat_position,

                    event:
                      t.event_name,

                    zone:
                      t.zone_name,
                  }),

                  {
                    errorCorrectionLevel:
                      "H",

                    margin: 2,

                    width: 300,
                  }
                );
            }


            return {
              ...t,
              qr_data_url,
            };
          }
        )
      );


    return res.json({
      tickets: withQR,
    });


  } catch (err) {

    console.error(
      "MY TICKETS ERROR:",
      err
    );


    return res.status(500).json({
      message:
        "Error fetching tickets",
    });
  }
}