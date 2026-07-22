import express from "express";
import * as organizerController from "../controllers/organizer.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadOrganizerLogo, uploadEventImages } from "../middlewares/upload.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

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

export default router;
