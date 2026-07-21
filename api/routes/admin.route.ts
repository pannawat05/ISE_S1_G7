import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import * as adminController from "../controllers/admin.controller.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticate, (req, res, next) =>
  requireAdmin(req as AuthRequest, res, next),
);

router.get("/events",                  (req, res) => adminController.listAllEvents(req as AuthRequest, res));
router.get("/events/:eventId",         (req, res) => adminController.getEventDetail(req as AuthRequest, res));
router.patch("/events/:eventId/approve", (req, res) => adminController.approveEvent(req as AuthRequest, res));
router.patch("/events/:eventId/reject",  (req, res) => adminController.rejectEvent(req as AuthRequest, res));

export default router;
