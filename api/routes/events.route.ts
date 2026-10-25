import express from "express";
import * as eventsController from "../controllers/events.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";
import * as bulkTicketController from "../controllers/bulkTicket.controller.js";

const router = express.Router();

// Route-level logger for Events
router.use(createRouteLogger("EVENTS"));

// Public endpoints — no auth required
router.get("/booking-config", eventsController.getBookingConfig);
router.get("/types", eventsController.listEventTypes);
router.get("/:id/zones", eventsController.listEventZones);
router.get("/:id/zones/:zoneId/seats", eventsController.listZoneSeats);
router.post("/:eventId/bulk-ticket-invitations/validate", (req, res) =>
  bulkTicketController.validatePublicInvitation(req as AuthRequest, res),
);
router.get("/:id", eventsController.getPublicEvent);
router.get("/", eventsController.listPublicEvents);

// Auth-required endpoints
router.post("/:id/booking-access", authenticate, (req, res) =>
  eventsController.getEventBookingAccess(req, res),
);
router.get("/:id/my-ticket-count", authenticate, (req, res) =>
  eventsController.getMyTicketCount(req, res),
);

export default router;
