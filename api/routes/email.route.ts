import express from "express";
import {
  sendOtp,
  verifyOtpHandler,
} from "../controllers/email.controller.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";

const router = express.Router();

// Route-level logger for Email
router.use(createRouteLogger("EMAIL"));

router.post("/sendotp", sendOtp);
router.post("/verifyotp", verifyOtpHandler);

export default router;
