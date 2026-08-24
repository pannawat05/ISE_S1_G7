import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

// All payment routes require authentication
router.post("/checkout",    authenticate, (req, res) => paymentController.checkout(req as AuthRequest, res));
router.post("/confirm",     authenticate, (req, res) => paymentController.confirmPayment(req as AuthRequest, res));
// router.get("/session/:id",  authenticate, paymentController.getSession);
router.get("/my-tickets",   authenticate, (req, res) => paymentController.getMyTickets(req as AuthRequest, res));

export default router;
