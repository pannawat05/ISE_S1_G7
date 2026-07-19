import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../model/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export const authenticateOrganizer = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

        // ค้นหา organizer_id จริงๆ จากตาราง users
        db.query("SELECT organizer_id FROM users WHERE id = ?", [decoded.userId], (err: any, result: any) => {
            if (err || !Array.isArray(result) || result.length === 0) {
                return res.status(500).json({ message: "Internal server error or user not found" });
            }

            const rows = result as Array<Record<string, any>>;
            const organizerId = rows[0]?.organizer_id;

            if (!organizerId) {
                return res.status(403).json({ message: "Forbidden: User is not registered as an organizer" });
            }

            // ฝากค่าไว้ใน req.user เพื่อส่งต่อให้ Controller ถัดไป
            // @ts-ignore - augmenting request with user property
            req.user = { organizerId: organizerId };
            next(); // 👈 ส่งไม้ต่อให้ฟังก์ชันถัดไปทำงาน
        });

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};