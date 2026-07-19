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
// การตั้งค่า MULTER STORAGE
// ==========================================
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = 'api/upload/organizer/logo/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `logo-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ==========================================
// 1. ระบบสมัครสมาชิก (SIGNUP)
// ==========================================
authRouter.post("/auth/signup", async (req: Request, res: Response) => {
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
    let uploadedFilePath: string | null = null;

    try {
        const { teamName } = req.body;
        let userId = (req as any).user?.userId;

        // ดึงและตรวจเช็ค Token
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

        if (!userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ message: "Unauthorized account" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please upload a team logo" });
        }

        const imagePath = req.file.path.replace(/\\/g, "/"); 
        uploadedFilePath = imagePath; 

        if (!teamName) {
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            return res.status(400).json({ message: "Team name is required" });
        }

        // แก้ไข: ถอดฟิลด์ 'id' ออก ปล่อยให้ฐานข้อมูลรัน AUTO_INCREMENT เองสำหรับทีมใหม่
        const sqlInsert = "INSERT INTO organizers (name, logo) VALUES (?, ?)";
        db.query(sqlInsert, [teamName, imagePath], (err, result) => {
            if (err) {
                console.error("MYSQL ERROR ON INSERT:", err);
                if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                    fs.unlinkSync(uploadedFilePath);
                }
                return res.status(500).json({ error: "Database saving failed" });
            }

            const newOrganizerId = (result as any).insertId;

            // แก้ไข: ใช้ userId จาก Token ค้นหาแทน email เพื่อป้องกันช่องโหว่การปลอมตัวตน (Impersonation)
            const sqlUpdate = "UPDATE users SET organizer_id = ?, role = 'organizer' WHERE id = ?";
            db.query(sqlUpdate, [newOrganizerId, userId], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("MYSQL ERROR ON UPDATE USER ROLE:", updateErr);
                    return res.status(500).json({ error: "Team created, but failed to update user role" });
                }

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
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        return res.status(500).json({ error: "Internal server error" });
    }
});

export const getUserID = (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const userId = decoded.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        return res.json({ userId });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export default authRouter;