import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import * as sys from "../controllers/sysadmin.controller.js";
import type { AuthRequest } from "../middlewares/types.js";
import { createRouteLogger } from "../middlewares/logger.middleware.js";

const router = express.Router();

// Route-level logger for Sysadmin
router.use(createRouteLogger("SYSADMIN"));

router.use(authenticate, (req, res, next) =>
  requireAdmin(req as AuthRequest, res, next),
);

router.get("/analytics", (req, res) => sys.getPlatformAnalytics(req as AuthRequest, res));
router.get("/logs", (req, res) => sys.listSystemLogDates(req as AuthRequest, res));
router.get("/logs/:date", (req, res) => sys.getSystemLogByDate(req as AuthRequest, res));
router.get("/platform-fee",    (req, res) => sys.getPlatformFee(req as AuthRequest, res));
router.patch("/platform-fee",  (req, res) => sys.updatePlatformFee(req as AuthRequest, res));
router.get("/booking-limit",   (req, res) => sys.getBookingLimit(req as AuthRequest, res));
router.patch("/booking-limit", (req, res) => sys.updateBookingLimit(req as AuthRequest, res));

// Event Types
router.get   ("/event-types",      (req, res) => sys.listEventTypes(req as AuthRequest, res));
router.post  ("/event-types",      (req, res) => sys.createEventType(req as AuthRequest, res));
router.put   ("/event-types/:id",  (req, res) => sys.updateEventType(req as AuthRequest, res));
router.delete("/event-types/:id",  (req, res) => sys.deleteEventType(req as AuthRequest, res));

// Payment Methods
router.get   ("/payment-methods",           (req, res) => sys.listPaymentMethods(req as AuthRequest, res));
router.post  ("/payment-methods",           (req, res) => sys.createPaymentMethod(req as AuthRequest, res));
router.put   ("/payment-methods/:id",       (req, res) => sys.updatePaymentMethod(req as AuthRequest, res));
router.patch ("/payment-methods/:id/toggle",(req, res) => sys.togglePaymentMethod(req as AuthRequest, res));
router.delete("/payment-methods/:id",       (req, res) => sys.deletePaymentMethod(req as AuthRequest, res));

// Users
router.get  ("/users",         (req, res) => sys.listUsers(req as AuthRequest, res));
router.patch("/users/:id/role",(req, res) => sys.updateUserRole(req as AuthRequest, res));

// Organizers
router.get("/organizers", (req, res) => sys.listOrganizers(req as AuthRequest, res));

export default router;
