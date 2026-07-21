import express, { type Request, type Response } from "express";
import db from "../model/db.js";

const EventRouter = express.Router();

EventRouter.get("/events", (req: Request, res: Response) => {
  db.query("SELECT * FROM event", (err: any, results: any) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).send("Error fetching events");
    }

    return res.status(200).json(results);
  });
});

export default EventRouter;