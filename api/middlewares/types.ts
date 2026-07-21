import type { Request } from "express";

export interface AuthRequest extends Omit<Request, "user"> {
  user?: {
    id: number;
    email: string;
  };
}

export interface OrganizeRequest extends Omit<Request, "user"> {
  user?: {
    id: number;
    email: string;
    organizerId: number;
  };
}
