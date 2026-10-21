import express from "express";
import { scanTicket } from "../controllers/checkin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";

const router = express.Router();

// Route-level logger for Checkin
router.use(createRouteLogger("CHECKIN"));

router.post("/scan", authenticate, (req, res) => scanTicket(req as AuthRequest, res));

export default router;
