import express from "express";
import { scanTicket } from "../controllers/checkin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

router.post("/scan", authenticate, (req, res) => scanTicket(req as AuthRequest, res));

export default router;
