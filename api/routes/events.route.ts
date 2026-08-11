import express from "express";
import * as eventsController from "../controllers/events.controller.js";

const router = express.Router();

// Public endpoints — no auth required
router.get("/types",              eventsController.listEventTypes);
router.get("/:id/zones",          eventsController.listEventZones);
router.get("/:id/zones/:zoneId/seats", eventsController.listZoneSeats);
router.get("/:id",                eventsController.getPublicEvent);
router.get("/",                   eventsController.listPublicEvents);

export default router;
