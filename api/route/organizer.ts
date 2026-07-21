import express, { type Request, type Response } from "express";
import path from "path"; // ✅ นำเข้า path module สำหรับจัดการ Absolute Path
import db from "../model/db.js";
import { authenticateOrganizer } from "../middleware/auth.js";
import uploadthumbnail from "../middleware/upload.js";

const Organizer_router = express.Router();

// ✅ ขยาย Type ของ Express Request เพื่อให้ TypeScript รู้อิทธิพลของ req.user
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

    // ตรวจสอบข้อมูลที่จำเป็น
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
      (err: any, result: any) => {
        if (err) {
          console.error("Database Error:", err);
          return res.status(500).send("Error adding event");
        }
        return res.status(200).send("Event added successfully");
      }
    );
  }
);

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

// ✅ ปรับแก้การส่งไฟล์รูปภาพด้วย Absolute Path
Organizer_router.get(
  "/organizer/image/:filename",
  (req: Request, res: Response) => {
    const filename = req.params.filename;
    
    // แปลง Relative Path ให้กลายเป็น Absolute Path ป้องกันปัญหา Express Error
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

export default Organizer_router;