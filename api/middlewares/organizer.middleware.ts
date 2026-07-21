import type { Response, NextFunction } from "express";
import type { OrganizeRequest } from "./types.js";
import { verifyToken } from "./auth.middleware.js";
import { findOrganizerByOwnerId } from "../model/organizer.model.js";

export async function authenticateOrganizer(
  req: OrganizeRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token is required" });
  }

  try {
    const decoded = verifyToken(token);
    const organizer = await findOrganizerByOwnerId(decoded.userId);

    if (!organizer) {
      return res.status(403).json({
        message: "Forbidden: User is not registered as an organizer",
      });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      organizerId: organizer.id,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
