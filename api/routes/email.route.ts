import express from "express";
import {
  sendOtp,
  verifyOtpHandler,
} from "../controllers/email.controller.js";

const router = express.Router();

router.post("/sendotp", sendOtp);

router.post("/verifyotp", verifyOtpHandler);

export default router;