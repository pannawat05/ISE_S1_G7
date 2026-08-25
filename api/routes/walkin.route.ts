import express from "express";
import * as walkinController from "../controllers/walkin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import type { AuthRequest } from "../middlewares/types.js";

const router = express.Router();

router.post("/", authenticate, (req, res) =>
  walkinController.createWalkInUser(req as AuthRequest, res),
);

export default router;