import express from "express";
import * as eventsController from "../controllers/events.controller.js";

const router = express.Router();

router.get("/", eventsController.listPublicEvents);

export default router;
