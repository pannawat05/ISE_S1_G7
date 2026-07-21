import express from "express";
import * as emailController from "../controllers/email.controller.js";

const router = express.Router();

router.post("/sendotp", emailController.sendOtp);
router.post("/verifyotp", emailController.verifyOtpHandler);

export default router;
