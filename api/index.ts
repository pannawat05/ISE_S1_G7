import express from "express";
import cors from "cors";
import path from "path";
import authRouter from "./routes/auth.route.js";
import emailRouter from "./routes/email.route.js";
import organizerRouter from "./routes/organizer.route.js";
import userRouter from "./routes/user.route.js";
import eventsRouter from "./routes/events.route.js";
import adminRouter from "./routes/admin.route.js";
import sysadminRouter from "./routes/sysadmin.route.js";
import paymentRouter from "./routes/payment.route.js";
import checkinRouter from "./routes/checkin.route.js";
import { execute } from "./model/query.js";
import "./middlewares/notificationScheduler.js";
import { logger } from "./lib/logger.js";
import { requestLogger, errorLogger } from "./middlewares/logger.middleware.js";

const app = express();
const port: number = Number(process.env.PORT) || 5001;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cors
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  }),
);

// Global HTTP Request Logger middleware
app.use(requestLogger);

// Files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// router
app.use("/email", emailRouter);
app.use("/auth", authRouter);
app.use("/organizer", organizerRouter);
app.use("/users", userRouter);
app.use("/events", eventsRouter);
app.use("/admin", adminRouter);
app.use("/sysadmin", sysadminRouter);
app.use("/payment", paymentRouter);
app.use("/checkin", checkinRouter);

app.get("/", (_req, res) => {
  res.send("ISE API is running");
});

// Global Error Logger middleware
app.use(errorLogger);

async function ensureEventSchema() {
  await execute(`
    CREATE TABLE IF NOT EXISTS event_views (
      event_id INT PRIMARY KEY,
      view_count INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_event_views_event FOREIGN KEY (event_id)
        REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value DECIMAL(5,2) NOT NULL
    )
  `);

  await execute(
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS whitelist_enabled BOOLEAN NOT NULL DEFAULT FALSE",
  );

  await execute(
    "ALTER TABLE events MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'deleted') NOT NULL DEFAULT 'pending'",
  );

  await execute(
    "INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES ('platform_fee_percent', 10.00)",
  );
  await execute(
    "INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES ('booking_limit', 4.00)",
  );
}

async function start() {
  try {
    await ensureEventSchema();
  } catch (err) {
    logger.error("EVENT SCHEMA ERROR:", err, "DATABASE");
  }
  app.listen(port, () => {
    logger.info(`API server started and listening on port ${port}`, { port }, "SYSTEM");
  });
}

start();
