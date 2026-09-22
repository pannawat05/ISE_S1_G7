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
import "./middlewares/notificationScheduler.js";

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

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
