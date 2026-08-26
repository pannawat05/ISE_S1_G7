import type { Request } from "express";
import multer from "multer";
import type { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

function makeStorage(dir: string, prefix: string) {
  return multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${unique}${path.extname(file.originalname)}`);
    },
  });
}

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"));
};

export const uploadOrganizerLogo = multer({
  storage: makeStorage("uploads/organizer/logo", "logo"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadEventImages = multer({
  storage: makeStorage("uploads/event", "event"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadZoneImages = multer({
  storage: makeStorage("uploads/zone", "zone"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Documents: accept PDF, Word, Excel, PowerPoint, images
const documentFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png", "image/jpeg", "image/jpg",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF, Word, Excel, PowerPoint, and image files are allowed"));
};

export const uploadEventDocuments = multer({
  storage: makeStorage("uploads/documents", "doc"),
  fileFilter: documentFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});
