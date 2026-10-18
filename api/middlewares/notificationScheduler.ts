import cron from "node-cron";
import db from "../model/db.js";
import { transporter } from "../lib/mailer.js";

console.log("========================================");
console.log("🔔 Notification Scheduler");
console.log("========================================");
console.log("Status   : STARTED");
console.log("Schedule : Every 5 minutes");
console.log("========================================");

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
          console.error(
            "❌ Database error:",
            err
          );

          resolve();
          return;
        }

        console.log(
          `📋 Found ${results.length} unsent ticket(s)`
        );

        const now = Date.now();
        const oneDayMs =
          24 * 60 * 60 * 1000;

        let checked = 0;
        let sent = 0;
        let skipped = 0;

        for (const ticket of results) {
          checked++;

          const targetDate =
            new Date(
              ticket.start_date
            ).getTime();

          const diffMs =
            targetDate - now;

          const hoursRemaining =
            diffMs /
            (1000 * 60 * 60);

          const userName =
            `${ticket.f_name} ${ticket.l_name}`;

          console.log("");
          console.log(
            "----------------------------------------"
          );
          console.log(
            `👤 User: ${userName}`
          );
          console.log(
            `📧 Email: ${ticket.user_email}`
          );
          console.log(
            `🎫 Ticket: ${ticket.ticket_id}`
          );
          console.log(
            `🎫 Event: ${ticket.event_name}`
          );
          console.log(
            `🕐 Start: ${ticket.start_date}`
          );
          console.log(
            `⏳ Remaining: ${hoursRemaining.toFixed(
              2
            )} hours`
          );

          const isWithin24Hours =
            diffMs > 0 &&
            diffMs <= oneDayMs;

          if (!isWithin24Hours) {
            console.log(
              "⏭️ Skip - Event is not within 24 hours"
            );

            skipped++;
            continue;
          }

          const mailOptions = {
            from:
              process.env.EMAIL_USER,

            to:
              ticket.user_email,

            subject:
              `Notification - ${ticket.event_name}`,

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

                <p>
                  Hello
                  <strong>
                    ${userName}
                  </strong>
                </p>

                <p>
                  Your event
                  "<strong>
                    ${ticket.event_name}
                  </strong>"
                  is starting soon!
                </p>

                <p>
                  <strong>
                    📅 Start Date:
                  </strong>
                  ${ticket.start_date}
                </p>

                <p>
                  <strong>
                    📍 Location:
                  </strong>
                  ${ticket.place_name}
                </p>

                <p>
                  <strong>
                    Description:
                  </strong>
                  ${
                    ticket.description ||
                    "No description"
                  }
                </p>

                <p>
                  <strong>
                    🎫 Ticket ID:
                  </strong>
                  ${ticket.ticket_id}
                </p>

                <hr />

                <p
                  style="
                    color: #666;
                    font-size: 14px;
                  "
                >
                  Please make sure you are ready
                  before the event starts.
                </p>

              </div>
            `,
          };

          try {
            await transporter.sendMail(
              mailOptions
            );

            await new Promise<void>(
              (resolveInsert, rejectInsert) => {
                db.query(
                  `
                  INSERT INTO event_notifications
                    (
                      ticket_id,
                      event_id,
                      user_id,
                      sent_at
                    )
                  VALUES (?, ?, ?, NOW())
                  `,
                  [
                    ticket.ticket_id,
                    ticket.event_id,
                    ticket.user_id,
                  ],
                  (insertErr) => {
                    if (insertErr) {
                      rejectInsert(insertErr);
                      return;
                    }

                    resolveInsert();
                  }
                );
              }
            );

            sent++;

            console.log(
              `✅ Notification sent and recorded for ${ticket.user_email}`
            );
          } catch (mailError) {
            console.error(
              `❌ Failed to send notification to ${ticket.user_email}:`,
              mailError
            );
          }
        }

        console.log("");
        console.log(
          "========================================"
        );
        console.log(
          "📊 Notification Check Result"
        );
        console.log(
          "========================================"
        );
        console.log(
          `Tickets checked : ${checked}`
        );
        console.log(
          `Emails sent     : ${sent}`
        );
        console.log(
          `Skipped         : ${skipped}`
        );
        console.log(
          "========================================"
        );

        resolve();
      }
    );
  });
}

cron.schedule(
  "*/5 * * * *",
  async () => {
    const startTime =
      Date.now();

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "🔔 Running Notification Check"
    );
    console.log(
      "Time:",
      new Date().toLocaleString(
        "th-TH",
        {
          timeZone:
            "Asia/Bangkok",
        }
      )
    );
    console.log(
      "========================================"
    );

    try {
      await checkNotifications();

      const elapsed =
        Date.now() - startTime;

      console.log(
        `⏱️ Execution time: ${elapsed} ms`
      );
    } catch (error) {
      console.error(
        "❌ Scheduler error:",
        error
      );
    }
  },
  {
    timezone: "Asia/Bangkok",
  }
);