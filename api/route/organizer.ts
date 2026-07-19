import express from "express";
import db from "../model/db.js";
import { authenticateOrganizer } from "../middleware/auth.js"; // เปลี่ยนมาใช้ตัวตรวจสอบที่เราปรับปรุงใหม่

const Organizer_router = express.Router();

// ขยาย Type ของ Express Request เพื่อไม่ให้ TypeScript แจ้งเตือนข้อผิดพลาด
declare global {
    namespace Express {
        interface Request {
            user?: { organizerId: number };
        }
    }
}

export {};

Organizer_router.post("/organizer/add_event", authenticateOrganizer, (req, res) => {
    const { name, place, type, start_date, description, theme, status, max_seat, is_active } = req.body;

    // ดึงค่า organizer_id ที่ผ่านการตรวจสอบจากฐานข้อมูลใน Middleware มาแล้วอย่างปลอดภัย
    const o_id = req.user?.organizerId; 
    
    if (!o_id) {
        return res.status(401).send("Unauthorized: Missing organizer ID");
    }
    
    db.query(
        "INSERT INTO `event`(`name`, `place`, `type`, `theme`, `description`, `start_date`, `status`, `is_active`, `max_seat`, `organizer_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [name, place, type, theme, description, start_date, status, is_active, max_seat, o_id], 
        (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).send("Error adding event");
            } 
            
            return res.status(200).send("Event added successfully");
        }
    );
});

export default Organizer_router;