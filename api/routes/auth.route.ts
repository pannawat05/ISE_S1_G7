import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadOrganizerLogo } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/getuserdata", authenticate, authController.getUserData);
router.get("/verify-token", authController.verifyTokenHandler);
router.get("/userid", authenticate, authController.getUserId);
router.post(
  "/organizer-register",
  authenticate,
  uploadOrganizerLogo.single("logo"),
  authController.registerOrganizer,
);

export default router;
