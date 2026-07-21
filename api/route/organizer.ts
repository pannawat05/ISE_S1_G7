import express, { type Request, type Response } from "express";
import path from "path";
import db from "../model/db.js";
import { authenticateOrganizer } from "../middleware/auth.js";
import uploadthumbnail from "../middleware/upload.js";

const Organizer_router = express.Router();

declare global {
  namespace Express {
    interface Request {
      user?: { organizerId: number };
    }
  }
}

interface AddEventBody {
  name: string;
  place: string;
  type: string;
  start_date: string;
  description?: string;
  theme?: string;
  status: "Draft" | "Published" | "Completed";
  max_seat: number;
  is_active: 0 | 1;
}

interface UpdateEventBody {
  name?: string;
  place?: string;
  type?: string;
  start_date?: string;
  description?: string;
  theme?: string;
  status?: "Draft" | "Published" | "Completed";
  max_seat?: number;
  is_active?: 0 | 1;
}

interface BulkUpdateItem extends UpdateEventBody {
  id: number;
}

// 🟢 PUBLIC ROUTE: สำหรับหน้าแรก (ไม่ต้องล็อกอิน)
Organizer_router.get("/events/public", (_req: Request, res: Response) => {
  db.query(
    "SELECT * FROM `event` WHERE `status` = 'Published' AND `is_active` = 1",
    (err: any, results: any) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).send("Error fetching public events");
      }
      return res.status(200).json(results || []);
    }
  );
});

// 🔒 ORGANIZER ROUTE: เพิ่มกิจกรรมใหม่
Organizer_router.post(
  "/organizer/add_event",
  authenticateOrganizer,
  uploadthumbnail.single("thumbnail"),
  (req: Request<{}, {}, AddEventBody>, res: Response) => {
    const {
      name,
      place,
      type,
      start_date,
      description,
      theme,
      status,
      max_seat,
      is_active,
    } = req.body;

    if (!name?.trim() || !place?.trim() || !start_date) {
      return res
        .status(400)
        .send("Missing required fields: name, place, start_date");
    }

    const o_id = req.user?.organizerId;
    if (!o_id) {
      return res.status(401).send("Unauthorized: Missing organizer ID");
    }

    const thumbnailPath = req.file ? req.file.filename : null;

    db.query(
      "INSERT INTO `event`(`name`, `place`, `type`, `theme`, `description`, `start_date`, `status`, `is_active`, `max_seat`, `organizer_id`, `thumbnail`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        place,
        type,
        theme,
        description,
        start_date,
        status,
        is_active,
        max_seat,
        o_id,
        thumbnailPath,
      ],
      (err: any) => {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).send("Error adding event");
        }
        return res.status(200).send("Event added successfully");
      }
    );
  }
);

// 🔒 ORGANIZER ROUTE: ดึงกิจกรรมของผู้จัดงานคนนั้น
Organizer_router.get(
  "/organizer/get_events",
  authenticateOrganizer,
  (req: Request, res: Response) => {
    const o_id = req.user?.organizerId;

    if (!o_id) {
      return res.status(401).send("Unauthorized: Missing organizer ID");
    }

    db.query(
      "SELECT * FROM `event` WHERE `organizer_id` = ?",
      [o_id],
      (err: any, results: any) => {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).send("Error fetching events");
        }

        return res.status(200).json(results);
      }
    );
  }
);

// 🔒 ORGANIZER ROUTE: ลบกิจกรรม
Organizer_router.delete(
  "/organizer/delete_event/:id",
  authenticateOrganizer,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const o_id = req.user?.organizerId;

    db.query(
      "DELETE FROM `event` WHERE `id` = ? AND `organizer_id` = ?",
      [id, o_id],
      (err: any, result: any) => {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).send("Error deleting event");
        }

        if (result.affectedRows === 0) {
          return res.status(404).send("Event not found or unauthorized");
        }

        return res.status(200).send("Event deleted successfully");
      }
    );
  }
);

// 🟢 PUBLIC ROUTE: แสดงรูปภาพ
Organizer_router.get(
  "/organizer/image/:filename",
  (req: Request, res: Response) => {
    const filename = req.params.filename;
    const absoluteImagePath = path.resolve(
      process.cwd(),
      "api/upload/organizer/thumbnail",
      filename
    );

    res.sendFile(absoluteImagePath, (err) => {
      if (err) {
        console.error("Error sending image:", err);
        if (!res.headersSent) {
          res.status(404).send("Image not found");
        }
      }
    });
  }
);

// 🔒 ORGANIZER ROUTE: แก้ไขกิจกรรม
Organizer_router.put(
  "/organizer/update_event/:id",
  authenticateOrganizer,
  uploadthumbnail.single("thumbnail"),
  (req: Request<{ id: string }, {}, UpdateEventBody>, res: Response) => {
    const { id } = req.params;
    const o_id = req.user?.organizerId;

    if (!o_id) {
      return res.status(401).send("Unauthorized: Missing organizer ID");
    }

    const {
      name,
      place,
      type,
      start_date,
      description,
      theme,
      status,
      max_seat,
      is_active,
    } = req.body;

    const fieldsToUpdate: string[] = [];
    const queryParams: any[] = [];

    if (name !== undefined) { fieldsToUpdate.push("`name` = ?"); queryParams.push(name); }
    if (place !== undefined) { fieldsToUpdate.push("`place` = ?"); queryParams.push(place); }
    if (type !== undefined) { fieldsToUpdate.push("`type` = ?"); queryParams.push(type); }
    if (start_date !== undefined) { fieldsToUpdate.push("`start_date` = ?"); queryParams.push(start_date); }
    if (description !== undefined) { fieldsToUpdate.push("`description` = ?"); queryParams.push(description); }
    if (theme !== undefined) { fieldsToUpdate.push("`theme` = ?"); queryParams.push(theme); }
    if (status !== undefined) { fieldsToUpdate.push("`status` = ?"); queryParams.push(status); }
    if (max_seat !== undefined) { fieldsToUpdate.push("`max_seat` = ?"); queryParams.push(Number(max_seat)); }
    if (is_active !== undefined) { fieldsToUpdate.push("`is_active` = ?"); queryParams.push(Number(is_active)); }

    if (req.file) {
      fieldsToUpdate.push("`thumbnail` = ?");
      queryParams.push(req.file.filename);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).send("No fields provided to update");
    }

    const sql = `UPDATE \`event\` SET ${fieldsToUpdate.join(", ")} WHERE \`id\` = ? AND \`organizer_id\` = ?`;
    queryParams.push(id, o_id);

    db.query(sql, queryParams, (err: any, result: any) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).send("Error updating event");
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Event not found or unauthorized");
      }

      return res.status(200).send("Event updated successfully");
    });
  }
);

// 🔒 ORGANIZER ROUTE: Bulk Update
Organizer_router.put(
  "/organizer/update_events_bulk",
  authenticateOrganizer,
  (req: Request<{}, {}, { events: BulkUpdateItem[] }>, res: Response) => {
    const o_id = req.user?.organizerId;
    const { events } = req.body;

    if (!o_id) {
      return res.status(401).send("Unauthorized: Missing organizer ID");
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).send("Invalid or empty events list");
    }

    const updatePromises = events.map((item) => {
      return new Promise((resolve, reject) => {
        const fieldsToUpdate: string[] = [];
        const queryParams: any[] = [];

        if (item.name !== undefined) { fieldsToUpdate.push("`name` = ?"); queryParams.push(item.name); }
        if (item.place !== undefined) { fieldsToUpdate.push("`place` = ?"); queryParams.push(item.place); }
        if (item.type !== undefined) { fieldsToUpdate.push("`type` = ?"); queryParams.push(item.type); }
        if (item.start_date !== undefined) { fieldsToUpdate.push("`start_date` = ?"); queryParams.push(item.start_date); }
        if (item.description !== undefined) { fieldsToUpdate.push("`description` = ?"); queryParams.push(item.description); }
        if (item.theme !== undefined) { fieldsToUpdate.push("`theme` = ?"); queryParams.push(item.theme); }
        if (item.status !== undefined) { fieldsToUpdate.push("`status` = ?"); queryParams.push(item.status); }
        if (item.max_seat !== undefined) { fieldsToUpdate.push("`max_seat` = ?"); queryParams.push(item.max_seat); }
        if (item.is_active !== undefined) { fieldsToUpdate.push("`is_active` = ?"); queryParams.push(item.is_active); }

        if (fieldsToUpdate.length === 0) {
          return resolve(true);
        }

        const sql = `UPDATE \`event\` SET ${fieldsToUpdate.join(", ")} WHERE \`id\` = ? AND \`organizer_id\` = ?`;
        queryParams.push(item.id, o_id);

        db.query(sql, queryParams, (err: any) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });

    Promise.all(updatePromises)
      .then(() => {
        return res.status(200).send("Bulk events updated successfully");
      })
      .catch((err) => {
        console.error("Bulk Update Error:", err);
        return res.status(500).send("Error updating multiple events");
      });
  }
);

export default Organizer_router;