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

export async function signup(req: Request, res: Response) {
  const { fname, lname, email, password } = req.body;

  if (!fname || !lname || !email || !password) {
    return res
      .status(400)
      .json({ message: "All fields are required", status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(fname, lname, email, hashedPassword);
    return res
      .status(201)
      .json({ message: "User registered successfully", status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Email already exists", status: 400 });
    }
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ error: "Internal server error", status: 500 });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required", status: 400 });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email or password", status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Invalid email or password", status: 401 });
    }

    const organizer = await findOrganizerByOwnerId(user.id);
    const token = signToken({ userId: user.id, email: user.email });

    return res.json({
      message: "Login successful",
      token,
      role: organizer ? "organizer" : user.role,
      status: 200,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
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
      return res.status(400).json({ message: "Unable to reset password", status: 400 });
    }

    const otpError = await verifyOtp(email, otp.toString());
    if (otpError) {
      return res.status(400).json({ error: otpError, status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hashedPassword);

    return res.json({ message: "Password reset successfully", status: 200 });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
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
    console.error("GET USER DATA ERROR:", err);
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

    return res.status(201).json({
      message: "Organizer registered successfully!",
      data: {
        organizerId,
        teamName,
        logoPath: logoUrl,
      },
    });
  } catch (error) {
    console.error("ORGANIZER REGISTER ERROR:", error);
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
