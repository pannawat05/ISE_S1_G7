import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import type { AuthRequest } from "../middlewares/types.js";
import { signToken } from "../middlewares/auth.middleware.js";
import {
  createUser,
  findUserByEmail,
  getUserProfile,
  updateUserPassword,
} from "../model/user.model.js";
import { verifyOtp } from "../model/email.model.js";
import {
  createOrganizer,
  findOrganizerByOwnerId,
} from "../model/organizer.model.js";
import fs from "fs";
import { logger } from "../lib/logger.js";

export async function signup(req: Request, res: Response) {
  const { fname, lname, email, password } = req.body;

  if (!fname || !lname || !email || !password) {
    req.log?.warn("Signup validation failed: Missing required fields", { email });
    return res
      .status(400)
      .json({ message: "All fields are required", status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(fname, lname, email, hashedPassword);
    req.log?.info("User registered successfully", { email, fname, lname });
    return res
      .status(201)
      .json({ message: "User registered successfully", status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      req.log?.warn("Signup failed: Email already exists", { email });
      return res
        .status(400)
        .json({ message: "Email already exists", status: 400 });
    }
    logger.error("SIGNUP ERROR:", err, "AUTH");
    return res.status(500).json({ error: "Internal server error", status: 500 });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    req.log?.warn("Login validation failed: Missing email or password");
    return res
      .status(400)
      .json({ message: "Email and password are required", status: 400 });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      req.log?.warn("Login failed: User email not found", { email });
      return res
        .status(401)
        .json({ message: "Invalid email or password", status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      req.log?.warn("Login failed: Invalid password", { email, userId: user.id });
      return res
        .status(401)
        .json({ message: "Invalid email or password", status: 401 });
    }

    const organizer = await findOrganizerByOwnerId(user.id);
    const token = signToken({ userId: user.id, email: user.email });

    req.log?.info("User login successful", {
      email: user.email,
      userId: user.id,
      role: organizer ? "organizer" : user.role,
    });

    return res.json({
      message: "Login successful",
      token,
      role: organizer ? "organizer" : user.role,
      status: 200,
    });
  } catch (err) {
    logger.error("LOGIN ERROR:", err, "AUTH");
    return res.status(500).json({ error: "Internal server error", status: 500 });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({
      message: "Email, OTP, and password are required",
      status: 400,
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
      status: 400,
    });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      req.log?.warn("Reset password failed: User not found", { email });
      return res.status(400).json({ message: "Unable to reset password", status: 400 });
    }

    const otpError = await verifyOtp(email, otp.toString());
    if (otpError) {
      req.log?.warn("Reset password failed: Invalid OTP", { email, error: otpError });
      return res.status(400).json({ error: otpError, status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hashedPassword);

    req.log?.info("Password reset successfully", { email, userId: user.id });
    return res.json({ message: "Password reset successfully", status: 200 });
  } catch (err) {
    logger.error("RESET PASSWORD ERROR:", err, "AUTH");
    return res.status(500).json({ error: "Internal server error", status: 500 });
  }
}

export async function getUserData(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Token is valid",
      decoded: {
        id: profile.id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        email: profile.email,
        role: profile.organizer_id ? "organizer" : profile.role,
        organizer_id: profile.organizer_id,
      },
    });
  } catch (err) {
    logger.error("GET USER DATA ERROR:", err, "AUTH");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyTokenHandler(req: Request, res: Response) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token is required" });
  }

  try {
    const { verifyToken } = await import("../middlewares/auth.middleware.js");
    const payload = verifyToken(token);
    return res.json({ message: "Token is valid", decoded: payload });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function registerOrganizer(
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response,
) {
  let uploadedFilePath: string | null = null;

  try {
    const { teamName } = req.body;

    if (!req.user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ message: "Unauthorized account" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a team logo" });
    }

    uploadedFilePath = req.file.path.replace(/\\/g, "/");

    if (!teamName) {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ message: "Team name is required" });
    }

    const existing = await findOrganizerByOwnerId(req.user.id);
    if (existing) {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ message: "You already have an organizer account" });
    }

    const logoUrl = `/${uploadedFilePath.replace(/\\/g, "/")}`;
    const organizerId = await createOrganizer(teamName, logoUrl, req.user.id);

    req.log?.info("Organizer registered successfully", {
      organizerId,
      teamName,
      userId: req.user.id,
    });

    return res.status(201).json({
      message: "Organizer registered successfully!",
      data: {
        organizerId,
        teamName,
        logoPath: logoUrl,
      },
    });
  } catch (error) {
    logger.error("ORGANIZER REGISTER ERROR:", error, "AUTH");
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserId(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return res.json({ userId: req.user.id });
}
