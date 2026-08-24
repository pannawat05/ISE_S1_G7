import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";


const router = express.Router();


import {
  checkout,
  confirmPayment,
  getMyTickets,
} from "../controllers/payment.controller.js";

router.post("/checkout", authenticate, checkout);
router.post("/confirm", authenticate, confirmPayment);
router.get("/my-tickets", authenticate, getMyTickets);
export default router;
