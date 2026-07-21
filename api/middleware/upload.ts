import multer from "multer";
import type { FileFilterCallback } from 'multer';
import type { Request } from 'express'; // 💡 เพิ่ม Import Request จาก express เพื่อแก้ Type Error
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const uploadDir = 'api/upload/organizer/thumbnail';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `event-thumbnail-${uniqueSuffix}${ext}`); // 💡 ใส่ dash (-) คั่นชื่อไฟล์ให้เรียบร้อย
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const uploadthumbnail = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 💡 ขยายขนาดไฟล์รองรับสูงสุดเป็น 10 MB (แก้ปัญหา File too large)
});

export default uploadthumbnail;