import express from "express";
import * as eventsController from "../controllers/events.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

// Route-level logger for Events
router.use(createRouteLogger("EVENTS"));

// Public endpoints — no auth required
router.get("/booking-config", eventsController.getBookingConfig);
router.get("/types", eventsController.listEventTypes);
router.get("/:id/zones", eventsController.listEventZones);
router.get("/:id/zones/:zoneId/seats", eventsController.listZoneSeats);
router.get("/:id", eventsController.getPublicEvent);
router.get("/", eventsController.listPublicEvents);

// Auth-required endpoints
router.get("/:id/my-ticket-count", authenticate, (req, res) =>
  eventsController.getMyTicketCount(req, res),
);

export default router;
