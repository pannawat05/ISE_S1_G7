import express from "express";
import * as organizerController from "../controllers/organizer.controller.js";
import * as whitelistController from "../controllers/whitelist.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";
import * as staffController from "../controllers/staff.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadOrganizerLogo, uploadEventImages, uploadZoneImages } from "../middlewares/upload.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

// ─── Organizer CRUD ───────────────────────────────────────────────────────────
router.post(
  "/create",
  authenticate,
  uploadOrganizerLogo.single("logo"),
  (req, res) => organizerController.createOrganizerHandler(req as AuthRequest, res),
);

router.get("/:id", authenticate, (req, res) =>
  organizerController.getOrganizer(req as AuthRequest, res),
);

router.get("/:id/events", authenticate, (req, res) =>
  organizerController.listEventsByOrganizer(req as AuthRequest, res),
);

router.get("/:id/events/:eventId", authenticate, (req, res) =>
  organizerController.getEventById(req as AuthRequest, res),
);

router.post(
  "/:id/events",
  authenticate,
  uploadEventImages.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "event_images", maxCount: 10 },
  ]),
  (req, res) => organizerController.createEventForOrganizer(req as AuthRequest, res),
);

router.put(
  "/:id/events/:eventId",
  authenticate,
  uploadEventImages.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "event_images", maxCount: 10 },
  ]),
  (req, res) => organizerController.updateEventHandler(req as AuthRequest, res),
);

router.put(
  "/:id",
  authenticate,
  uploadOrganizerLogo.single("logo"),
  (req, res) => organizerController.updateOrganizerHandler(req as AuthRequest, res),
);

router.delete("/:id", authenticate, (req, res) =>
  organizerController.deleteOrganizerHandler(req as AuthRequest, res),
);

// Dashboard stats
router.get("/:id/dashboard", authenticate, (req, res) =>
  organizerController.getDashboard(req as AuthRequest, res),
);
router.get("/:id/analytics", authenticate, (req, res) =>
  analyticsController.getOrganizerAnalytics(req as AuthRequest, res),
);
router.get("/:id/analytics/export", authenticate, (req, res) =>
  analyticsController.exportOrganizerAnalytics(req as AuthRequest, res),
);

// ─── User search (for whitelist) ──────────────────────────────────────────────
router.get("/:id/search-users", authenticate, (req, res) =>
  whitelistController.searchUsers(req as AuthRequest, res),
);

// ─── Event CRUD ───────────────────────────────────────────────────────────────
router.get("/:id/events", authenticate, (req, res) =>
  organizerController.listEventsByOrganizer(req as AuthRequest, res),
);

router.post(
  "/:id/events",
  authenticate,
  uploadEventImages.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "event_images", maxCount: 10 },
  ]),
  (req, res) => organizerController.createEventForOrganizer(req as AuthRequest, res),
);

router.get("/:id/events/:eventId", authenticate, (req, res) =>
  organizerController.getEventById(req as AuthRequest, res),
);

router.put(
  "/:id/events/:eventId",
  authenticate,
  uploadEventImages.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "event_images", maxCount: 10 },
  ]),
  (req, res) => organizerController.updateEventHandler(req as AuthRequest, res),
);

// ─── Zone routes ──────────────────────────────────────────────────────────────
router.get("/:id/events/:eventId/zones", authenticate, (req, res) =>
  organizerController.listZones(req as AuthRequest, res),
);

router.post(
  "/:id/events/:eventId/zones",
  authenticate,
  uploadZoneImages.fields([{ name: "zone_images", maxCount: 5 }]),
  (req, res) => organizerController.createZoneHandler(req as AuthRequest, res),
);

router.put(
  "/:id/events/:eventId/zones/:zoneId",
  authenticate,
  uploadZoneImages.fields([{ name: "zone_images", maxCount: 5 }]),
  (req, res) => organizerController.updateZoneHandler(req as AuthRequest, res),
);

router.delete("/:id/events/:eventId/zones/:zoneId", authenticate, (req, res) =>
  organizerController.deleteZoneHandler(req as AuthRequest, res),
);

// ─── Whitelist routes ─────────────────────────────────────────────────────────
router.get("/:id/events/:eventId/whitelist", authenticate, (req, res) =>
  whitelistController.listWhitelist(req as AuthRequest, res),
);
router.get("/:id/events/:eventId/staff", authenticate, (req, res) =>
  staffController.listEventStaff(req as AuthRequest, res),
);
router.post("/:id/events/:eventId/staff", authenticate, (req, res) =>
  staffController.assignEventStaff(req as AuthRequest, res),
);
router.delete("/:id/events/:eventId/staff/:assignmentId", authenticate, (req, res) =>
  staffController.removeEventStaff(req as AuthRequest, res),
);

router.post("/:id/events/:eventId/whitelist", authenticate, (req, res) =>
  whitelistController.addToWhitelist(req as AuthRequest, res),
);

router.delete("/:id/events/:eventId/whitelist/:wlId", authenticate, (req, res) =>
  whitelistController.removeFromWhitelist(req as AuthRequest, res),
);
router.post("/:id/stripe/onboard", authenticate, (req, res) =>
  organizerController.createStripeOnboardLinkHandler(req as AuthRequest, res),
);

export default router;
