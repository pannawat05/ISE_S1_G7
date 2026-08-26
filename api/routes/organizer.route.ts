import express from "express";
import * as organizerController from "../controllers/organizer.controller.js";
import * as whitelistController from "../controllers/whitelist.controller.js";
import * as staffController from "../controllers/staff.controller.js";
import * as documentController from "../controllers/document.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadOrganizerLogo, uploadEventImages, uploadZoneImages, uploadEventDocuments } from "../middlewares/upload.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

// ─── Organizer CRUD ───────────────────────────────────────────────────────────
router.post("/create", authenticate, uploadOrganizerLogo.single("logo"),
  (req, res) => organizerController.createOrganizerHandler(req as AuthRequest, res));

router.get("/:id", authenticate,
  (req, res) => organizerController.getOrganizer(req as AuthRequest, res));

router.put("/:id", authenticate, uploadOrganizerLogo.single("logo"),
  (req, res) => organizerController.updateOrganizerHandler(req as AuthRequest, res));

router.delete("/:id", authenticate,
  (req, res) => organizerController.deleteOrganizerHandler(req as AuthRequest, res));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/:id/dashboard", authenticate,
  (req, res) => organizerController.getDashboard(req as AuthRequest, res));

// ─── User search (for whitelist) ──────────────────────────────────────────────
router.get("/:id/search-users", authenticate,
  (req, res) => whitelistController.searchUsers(req as AuthRequest, res));

// ─── Event CRUD ───────────────────────────────────────────────────────────────
router.get("/:id/events", authenticate,
  (req, res) => organizerController.listEventsByOrganizer(req as AuthRequest, res));

router.post("/:id/events", authenticate,
  uploadEventImages.fields([{ name: "cover_image", maxCount: 1 }, { name: "event_images", maxCount: 10 }]),
  (req, res) => organizerController.createEventForOrganizer(req as AuthRequest, res));

router.get("/:id/events/:eventId", authenticate,
  (req, res) => organizerController.getEventById(req as AuthRequest, res));

router.put("/:id/events/:eventId", authenticate,
  uploadEventImages.fields([{ name: "cover_image", maxCount: 1 }, { name: "event_images", maxCount: 10 }]),
  (req, res) => organizerController.updateEventHandler(req as AuthRequest, res));

// Soft delete — เปลี่ยน status เป็น 'deleted' (เฉพาะงานยังไม่เริ่ม หรือจบแล้ว)
router.delete("/:id/events/:eventId", authenticate,
  (req, res) => organizerController.deleteEventSoft(req as AuthRequest, res));

// ─── Zone routes ──────────────────────────────────────────────────────────────
router.get("/:id/events/:eventId/zones", authenticate,
  (req, res) => organizerController.listZones(req as AuthRequest, res));

router.get("/:id/events/:eventId/zones/:zoneId/rows", authenticate,
  (req, res) => organizerController.getZoneRows(req as AuthRequest, res));

router.post("/:id/events/:eventId/zones", authenticate,
  uploadZoneImages.fields([{ name: "zone_images", maxCount: 5 }]),
  (req, res) => organizerController.createZoneHandler(req as AuthRequest, res));

router.put("/:id/events/:eventId/zones/:zoneId", authenticate,
  uploadZoneImages.fields([{ name: "zone_images", maxCount: 5 }]),
  (req, res) => organizerController.updateZoneHandler(req as AuthRequest, res));

router.delete("/:id/events/:eventId/zones/:zoneId", authenticate,
  (req, res) => organizerController.deleteZoneHandler(req as AuthRequest, res));

// ─── Whitelist routes ─────────────────────────────────────────────────────────
router.get("/:id/events/:eventId/whitelist", authenticate,
  (req, res) => whitelistController.listWhitelist(req as AuthRequest, res));

router.post("/:id/events/:eventId/whitelist", authenticate,
  (req, res) => whitelistController.addToWhitelist(req as AuthRequest, res));

router.delete("/:id/events/:eventId/whitelist/:wlId", authenticate,
  (req, res) => whitelistController.removeFromWhitelist(req as AuthRequest, res));

// ─── Staff routes ─────────────────────────────────────────────────────────────
router.get("/:id/staff", authenticate,
  (req, res) => staffController.listStaff(req as AuthRequest, res));

router.post("/:id/staff", authenticate,
  (req, res) => staffController.addStaff(req as AuthRequest, res));

router.patch("/:id/staff/:staffId", authenticate,
  (req, res) => staffController.updateStaffRole(req as AuthRequest, res));

router.delete("/:id/staff/:staffId", authenticate,
  (req, res) => staffController.removeStaff(req as AuthRequest, res));

// ─── Event Staff routes ───────────────────────────────────────────────────────
router.get("/:id/events/:eventId/staff", authenticate,
  (req, res) => staffController.listEventStaff(req as AuthRequest, res));

router.post("/:id/events/:eventId/staff", authenticate,
  (req, res) => staffController.assignStaffToEvent(req as AuthRequest, res));

router.delete("/:id/events/:eventId/staff/:staffId", authenticate,
  (req, res) => staffController.removeStaffFromEvent(req as AuthRequest, res));

// ─── Document routes ──────────────────────────────────────────────────────────
router.get("/:id/events/:eventId/documents", authenticate,
  (req, res) => documentController.listDocuments(req as AuthRequest, res));

router.post("/:id/events/:eventId/documents", authenticate,
  uploadEventDocuments.array("documents", 10),
  (req, res) => documentController.uploadDocuments(req as AuthRequest, res));

router.delete("/:id/events/:eventId/documents/:docId", authenticate,
  (req, res) => documentController.removeDocument(req as AuthRequest, res));

export default router;
