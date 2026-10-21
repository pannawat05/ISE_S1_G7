import type { Request } from "express";
import type { ScopedLogger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      log?: ScopedLogger;
      startTime?: number;
    }
  }
}

export interface AuthRequest extends Omit<Request, "user"> {
  user?: {
    id: number;
    email: string;
  };
  log?: ScopedLogger;
}

export interface OrganizeRequest extends Omit<Request, "user"> {
  user?: {
    id: number;
    email: string;
    organizerId: number;
  };
  log?: ScopedLogger;
}
