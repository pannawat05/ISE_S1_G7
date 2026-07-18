import express from 'express';
import type { Request, Response } from 'express';
import db from '../model/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const authRouter = express.Router();

// ==========================================
// การตั้งค่า MULTER STORAGE (ระบุ Type ครบถ้วน)
// ==========================================
const storage = multer.diskStorage({
    destination: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, destination: string) => void
    ) => {
        // แก้ไข: เอาเครื่องหมาย / ตัวแรกออก เพื่อระบุว่าอยู่ในโฟลเดอร์โปรเจกต์หลังบ้าน
        const uploadDir = 'api/upload/organizer/logo/';
        
        // ตรวจสอบว่ามีโฟลเดอร์นี้ไหม ถ้าไม่มีให้สร้างขึ้นมาใหม่อัตโนมัติ
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, filename: string) => void
    ) => {
        // ตั้งชื่อไฟล์ใหม่ป้องกันชื่อซ้ำกัน
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `logo-${uniqueSuffix}${ext}`);
    }
});

// ตรวจสอบประเภทไฟล์ (ระบุ Type ครบถ้วน)
const fileFilter = (
    req: Request, 
    file: Express.Multer.File, 
    cb: FileFilterCallback
) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาดไฟล์ไว้ที่ 5MB
});

// ==========================================
// 1. ระบบสมัครสมาชิก (SIGNUP)
// ==========================================
authRouter.post("/auth/signup", async (req: Request, res: Response) => {
    console.log("Body:", req.body);
    const { fname, lname, email, password } = req.body;

    if (!fname || !lname || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        db.query(
            "INSERT INTO users (f_name, l_name, email, password) VALUES (?, ?, ?, ?)",
            [fname, lname, email, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error("MYSQL ERROR:", err);
                    if ((err as any).code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: "Email already exists" });
                    }
                    return res.status(500).json({ error: "Internal server error" });
                }
                return res.status(201).json({ message: "User registered successfully" });
            }
        );
    } catch (bcryptErr) {
        console.error("BCRYPT HASH ERROR:", bcryptErr);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ==========================================
// 2. ระบบเข้าสู่ระบบ (LOGIN)
// ==========================================
authRouter.post("/auth/login", (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, result) => {      
            if (err) {
                console.error("MYSQL ERROR:", err);
                return res.status(500).json({ error: "Internal server error" });
            }

            if (!Array.isArray(result) || result.length === 0) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const users = result as { id: number; email: string; password: string }[];
            const user = users[0];
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            try {
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: "Invalid email or password" });
                }

                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: "1h" }
                );

                return res.json({ 
                    message: "Login successful",
                    token: token 
                });
            } catch (bcryptErr) {
                console.error("BCRYPT ERROR:", bcryptErr);
                return res.status(500).json({ error: "Internal server error" });
            }
        }
    );
});

// ==========================================
// 3. ดึงข้อมูลประวัติ USER จาก TOKEN (GET USER DATA)
// ==========================================
authRouter.get("/auth/getuserdata", (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
        
        // แก้ไข: เปลี่ยนการเขียนดึงข้อมูล DB จากฟังก์ชันเดิมที่เขียนบล็อกค้างไว้ ให้ดึงผ่าน Callback ที่ถูกต้อง
        db.query(
            "SELECT id, f_name as firstname, l_name as lastname, email FROM users WHERE email = ?",
            [decoded.email],
            (err, result) => {
                if (err) {
                    console.error("MYSQL ERROR:", err);
                    return res.status(500).json({ error: "Internal server error" });
                }

                const users = result as any[];
                if (users.length === 0) {
                    return res.status(404).json({ message: "User not found" });
                }

                // ส่งข้อมูล decoded กลับไปให้ตรงกับความต้องการของ React
                return res.json({ 
                    message: "Token is valid", 
                    decoded: users[0] 
                });
            }
        );
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});

// ==========================================
// 4. ระบบตรวจสอบความถูกต้องโทเค็น (VERIFY TOKEN)
// ==========================================
authRouter.get("/auth/verify-token", (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.json({ message: "Token is valid", decoded });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});

// ==========================================
// 5. ระบบสมัครสมาชิกทีม ORGANIZER + อัปโหลดโลโก้
// ==========================================
authRouter.post("/auth/organizer-register", upload.single('logo'), (req: Request, res: Response) => {
    // เก็บตัวแปรไว้ลบไฟล์ในกรณีที่เกิดข้อผิดพลาดภายหลัง
    let uploadedFilePath: string | null = null;

    try {
        const { teamName,email} = req.body;
        let userId = (req as any).user?.userId;

        // ดึง Token มาแกะหากยังไม่มี Middleware
        if (!userId) {
            const token = req.headers.authorization?.split(" ")[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
                    userId = decoded.userId;
                } catch (e) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(401).json({ message: "Invalid token authentication" });
                }
            }
        }

        // หากไม่มีสิทธิ์การใช้งาน (ไม่ได้ล็อกอิน) ให้ลบไฟล์ที่เพิ่งอัปโหลดขึ้นมาทันที
        if (!userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ message: "Unauthorized account" });
        }

        // 1. ตรวจสอบไฟล์อัปโหลด
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a team logo" });
        }

        // แปลงเครื่องหมายกั้นตำแหน่งพาธเผื่อรันบน Windows
        const imagePath = req.file.path.replace(/\\/g, "/"); 
        uploadedFilePath = imagePath; // บันทึกตำแหน่งไว้เผื่อทำลายทิ้งถ้า DB พัง

        if (!teamName) {
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            return res.status(400).json({ message: "Team name is required" });
        }

        // 2. ขั้นตอนที่ 1: บันทึกข้อมูลลงตาราง organizers
        const sqlInsert = "INSERT INTO organizers (id,name, logo) VALUES (?, ?, ?)";
        db.query(sqlInsert, [ userId, teamName, imagePath], (err, result) => {
            if (err) {
                console.error("MYSQL ERROR ON INSERT:", err);
                // ลบรูปภาพทิ้งทันทีหากเซฟข้อมูลลงตารางแรกพัง
                if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                    fs.unlinkSync(uploadedFilePath);
                }
                return res.status(500).json({ error: "Database saving failed" });
            }

            // ดึงค่า ID ของทีมผู้จัดงานที่เพิ่งสร้างขึ้นมาสด ๆ จากคำสั่งสอดแทรกข้อมูล
            const newOrganizerId = (result as any).insertId;

            // 3. ขั้นตอนที่ 2: อัปเดตตาราง users (ทำอยู่ข้างใน Callback เพื่อป้องกัน Race Condition)
            const sqlUpdate = "UPDATE users SET organizer_id = ?, role = 'organizer' WHERE email = ?";
            db.query(sqlUpdate, [newOrganizerId, email], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("MYSQL ERROR ON UPDATE USER ROLE:", updateErr);
                    // หมายเหตุ: กรณีนี้รูปถูกจัดเก็บแล้วและตารางแรกผ่านแล้ว จะไม่ลบรูปทิ้ง แต่แจ้งเตือนเรื่องบทบาทผู้ใช้
                    return res.status(500).json({ error: "Team created, but failed to update user role" });
                }

                // ส่ง Response สำเร็จกลับไปฝั่ง React เพียง *ครั้งเดียว* หลังทำงานเสร็จครบทุกขั้นตอน
                return res.status(201).json({ 
                    message: "Organizer registered successfully!",
                    data: {
                        organizerId: newOrganizerId,
                        teamName: teamName,
                        logoPath: imagePath
                    }
                });
            });
        });

    } catch (error) {
        console.error("Server error during upload:", error);
        // หากเกิดข้อยกเว้นภายในระบบ ให้ทำลายไฟล์ภาพเพื่อป้องกันไฟล์ขยะตกค้าง
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default authRouter;