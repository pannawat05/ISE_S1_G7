import type { Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import type { AuthRequest } from "../middlewares/types.js";
import { findUserByEmail, createUser } from "../model/user.model.js";

export async function createWalkInUser(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { firstName, lastName, email } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  const firstname = firstName?.trim();
  const lastname = lastName?.trim();
  const normalizedEmail = email?.trim().toLowerCase();

  if (!firstname || !lastname || !normalizedEmail) {
    return res.status(400).json({
      message: "firstName, lastName and email are required",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    });
  }

  try {
    // ถ้ามี user อยู่แล้ว ใช้ user เดิม
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.json({
        userId: existingUser.id,
        firstname: existingUser.f_name,
        lastname: existingUser.l_name,
        email: existingUser.email,
        existing: true,
      });
    }

    // สร้าง password แบบสุ่มสำหรับ Walk-in user
    const temporaryPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const userId = await createUser(
      firstname,
      lastname,
      normalizedEmail,
      hashedPassword,
    );

    return res.status(201).json({
      userId,
      firstname,
      lastname,
      email: normalizedEmail,
      existing: false,
    });
  } catch (err) {
    console.error("CREATE WALK-IN USER ERROR:", err);

    return res.status(500).json({
      message: "Failed to create walk-in user",
    });
  }
}