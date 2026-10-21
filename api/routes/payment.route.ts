import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";

const router = express.Router();

// Route-level logger for Payment
router.use(createRouteLogger("PAYMENT"));

router.post("/checkout", authenticate, (req, res) => paymentController.checkout(req as AuthRequest, res));
router.post("/confirm",  authenticate, (req, res) => paymentController.confirmPayment(req as AuthRequest, res));
router.post("/cancel",   authenticate, (req, res) => paymentController.cancelPayment(req as AuthRequest, res));
router.get("/my-tickets", authenticate, (req, res) => paymentController.getMyTickets(req as AuthRequest, res));

export default router;
