import express from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

router.get("/me", authenticate, (req, res) =>
  userController.getMe(req as AuthRequest, res),
);

router.patch("/me", authenticate, (req, res) =>
  userController.updateMe(req as AuthRequest, res),
);

router.get("/my-organizers", authenticate, (req, res) =>
  userController.getMyOrganizers(req as AuthRequest, res),
);

router.get("/my-staff-assignments", authenticate, (req, res) =>
  userController.getMyStaffAssignments(req as AuthRequest, res),
);

export default router;
