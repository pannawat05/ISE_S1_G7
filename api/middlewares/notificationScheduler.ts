import cron from "node-cron";
import db from "../model/db.js";
import { transporter } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";

logger.info("Notification Scheduler started (Every 5 minutes)", undefined, "SCHEDULER");

async function checkNotifications(): Promise<void> {
  return new Promise<void>((resolve) => {
    db.query(
      `
      SELECT
        u.id AS user_id,
        u.f_name,
        u.l_name,
        u.email AS user_email,

        t.id AS ticket_id,
        t.qrcode,
        t.status AS ticket_status,

        e.id AS event_id,
        e.name AS event_name,
        e.start_date,
        e.end_date,
        e.description,
        e.place_name

      FROM users u

      INNER JOIN tickets t
        ON t.users_id = u.id

      INNER JOIN seats s
        ON s.id = t.seat_id

      INNER JOIN zones z
        ON z.id = s.zone_id

      INNER JOIN events e
        ON e.id = z.event_id

      LEFT JOIN event_notifications en
        ON en.ticket_id = t.id

      WHERE
        t.status = 'paid'
        AND en.ticket_id IS NULL

      ORDER BY e.start_date ASC
      `,
      async (err, results: any[]) => {
        if (err) {
          logger.error("Scheduler database error:", err, "SCHEDULER");
          resolve();
          return;
        }

        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        let checked = 0;
        let sent = 0;
        let skipped = 0;

        for (const ticket of results) {
          checked++;

          const targetDate = new Date(ticket.start_date).getTime();
          const diffMs = targetDate - now;

          const isWithin24Hours = diffMs > 0 && diffMs <= oneDayMs;

          if (!isWithin24Hours) {
            skipped++;
            continue;
          }

          const userName = `${ticket.f_name} ${ticket.l_name}`;
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: ticket.user_email,
            subject: `Notification - ${ticket.event_name}`,
            html: `
              <div
                style="
                  font-family: Arial, sans-serif;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  border: 1px solid #eee;
                  border-radius: 10px;
                "
              >
                <h2 style="color: #7c3aed;">
                  🎫 Magic Ticket
                </h2>
                <p>Hello <strong>${userName}</strong></p>
                <p>Your event "<strong>${ticket.event_name}</strong>" is starting soon!</p>
                <p><strong>📅 Start Date:</strong> ${ticket.start_date}</p>
                <p><strong>📍 Location:</strong> ${ticket.place_name}</p>
                <p><strong>Description:</strong> ${ticket.description || "No description"}</p>
                <p><strong>🎫 Ticket ID:</strong> ${ticket.ticket_id}</p>
                <hr />
                <p style="color: #666; font-size: 14px;">Please make sure you are ready before the event starts.</p>
              </div>
            `,
          };

          try {
            await transporter.sendMail(mailOptions);

            await new Promise<void>((resolveInsert, rejectInsert) => {
              db.query(
                `
                INSERT INTO event_notifications
                  (ticket_id, event_id, user_id, sent_at)
                VALUES (?, ?, ?, NOW())
                `,
                [ticket.ticket_id, ticket.event_id, ticket.user_id],
                (insertErr) => {
                  if (insertErr) {
                    rejectInsert(insertErr);
                    return;
                  }
                  resolveInsert();
                },
              );
            });

            sent++;
            logger.info(`Notification sent to ${ticket.user_email}`, { ticketId: ticket.ticket_id }, "SCHEDULER");
          } catch (mailError) {
            logger.error(`Failed to send notification to ${ticket.user_email}:`, mailError, "SCHEDULER");
          }
        }

        if (checked > 0) {
          logger.info(`Notification check completed: ${checked} checked, ${sent} sent, ${skipped} skipped`, undefined, "SCHEDULER");
        }

        resolve();
      },
    );
  });
}

cron.schedule(
  "*/5 * * * *",
  async () => {
    try {
      await checkNotifications();
    } catch (error) {
      logger.error("Notification scheduler error:", error, "SCHEDULER");
    }
  },
  {
    timezone: "Asia/Bangkok",
  },
);

// ─── Expired Reservation Cleanup ─────────────────────────────────────────────
async function cancelExpiredReservations(): Promise<void> {
  try {
    const result = await new Promise<{ affectedRows: number }>((resolve, reject) => {
      db.query(
        `UPDATE tickets
         SET status = 'cancelled'
         WHERE status = 'reserved'
           AND reserved_at IS NOT NULL
           AND reserved_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
        (err, res: any) => {
          if (err) reject(err);
          else resolve(res);
        },
      );
    });

    if (result.affectedRows > 0) {
      logger.info(`Cancelled ${result.affectedRows} expired reservation(s)`, undefined, "CLEANUP");
    }
  } catch (err) {
    logger.error("Failed to cancel expired reservations:", err, "CLEANUP");
  }
}

cron.schedule(
  "*/5 * * * *",
  async () => {
    await cancelExpiredReservations();
  },
  { timezone: "Asia/Bangkok" },
);
