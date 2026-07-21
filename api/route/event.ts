import express, { type Request, type Response } from "express";
import db from "../model/db.js";
import uploadthumbnail from "../middleware/upload.js"; // 💡 Import ตัวอัปโหลดรูปภาพ

const EventRouter = express.Router();

// 1. ดึงข้อมูลกิจกรรมทั้งหมด (Public - หน้าแรกใช้ตัวนี้ยิงได้เลย ไม่ติด 401)
EventRouter.get("/get_events", (req: Request, res: Response) => {
  db.query("SELECT * FROM event", (err: any, results: any) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).send("Error fetching events");
    }
    return res.status(200).json(results);
  });
});

// 2. บันทึกกิจกรรมใหม่ลง DB (พร้อมรองรับการอัปโหลดรูปภาพ thumbnail)
EventRouter.post("/create_event", uploadthumbnail.single("thumbnail"), (req: Request, res: Response) => {
  const { title, category, status, date, time, location, price, total_tickets } = req.body;
  const thumbnail = req.file ? req.file.filename : null; // 💡 ดึงชื่อไฟล์รูปที่อัปโหลดสำเร็จ

  const sql = `INSERT INTO event (title, category, status, date, time, location, price, total_tickets, thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [title, category, status, date, time, location, price, total_tickets, thumbnail],
    (err: any, result: any) => {
      if (err) {
        console.error("Database Insert Error:", err);
        return res.status(500).send("Error creating event");
      }
      return res.status(201).json({ message: "Created successfully", id: result.insertId });
    }
  );
});

export default EventRouter;