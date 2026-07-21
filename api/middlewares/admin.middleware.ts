import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./types.js";
import { findUserById } from "../model/user.model.js";

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const user = await findUserById(req.user.id);
    if (!user || !["admin", "sysadmin"].includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: Admin or SysAdmin only" });
    }
    next();
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
}
