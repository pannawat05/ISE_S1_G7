import express, { type Request, type Response } from "express";
import db from "../model/db.js";
import { authenticateOrganizer } from "../middleware/auth.js"; // เปลี่ยนมาใช้ตัวตรวจสอบที่เราปรับปรุงใหม่

const Organizer_router = express.Router();

// ขยาย Type ของ Express Request เพื่อไม่ให้ TypeScript แจ้งเตือนข้อผิดพลาด
// ✅ ตอนนี้ augmentation นี้จะมีผลจริง เพราะไม่มีการ override express ให้เป็น `any` อีกต่อไป
declare global {
  namespace Express {
    interface Request {
      user?: { organizerId: number };
    }
  }
}

// ✅ กำหนด shape ของ body ให้ชัดเจน แทนการปล่อยเป็น any โดยปริยาย
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
  (req: Request<{}, {}, AddEventBody>, res: Response) => {
    const { name, place, type, start_date, description, theme, status, max_seat, is_active } = req.body;

    // ✅ ตรวจสอบข้อมูลที่จำเป็นก่อน insert ลง DB (เดิมไม่มีการเช็คเลย ถ้าค่าที่จำเป็นขาดจะทำให้เกิด SQL error ที่ debug ยาก)
    if (!name?.trim() || !place?.trim() || !start_date) {
      return res.status(400).send("Missing required fields: name, place, start_date");
    }

    // ดึงค่า organizer_id ที่ผ่านการตรวจสอบจากฐานข้อมูลใน Middleware มาแล้วอย่างปลอดภัย
    const o_id = req.user?.organizerId;
    if (!o_id) {
      return res.status(401).send("Unauthorized: Missing organizer ID");
    }

    db.query(
      "INSERT INTO `event`(`name`, `place`, `type`, `theme`, `description`, `start_date`, `status`, `is_active`, `max_seat`, `organizer_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, place, type, theme, description, start_date, status, is_active, max_seat, o_id],
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
      }
    );
  }
);


export default Organizer_router;