import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import type { AuthRequest } from "../middlewares/types.js";
import { signToken } from "../middlewares/auth.middleware.js";
import {
  createUser,
  findUserByEmail,
  getUserProfile,
} from "../model/user.model.js";
import {
  createOrganizer,
  findOrganizerByOwnerId,
} from "../model/organizer.model.js";
import { query, execute } from "../model/query.js";
import { saveOtp, verifyOtp, deleteOtp } from "../model/email.model.js";
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

// ─── Forgot Password — ส่ง OTP ไปยัง email ──────────────────────────────────
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  if (!email?.trim()) return res.status(400).json({ message: "กรุณาระบุ email" });

  try {
    // ตรวจสอบว่า email มีในระบบ
    const users = await query<{ id: number; f_name: string }[]>(
      "SELECT id, f_name FROM users WHERE email = ? LIMIT 1",
      [email.trim()],
    );
    // ไม่บอกว่าไม่มี email เพื่อความปลอดภัย
    if (!users.length) {
      return res.json({ message: "ถ้ามี account อยู่ระบบจะส่ง OTP ไปให้" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(email.trim(), otp);

    const { transporter } = await import("../lib/mailer.js");
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email.trim(),
      subject: "Magic Ticket — รีเซ็ตรหัสผ่าน",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#7c3aed">🎫 Magic Ticket</h2>
          <p>คุณ ${users[0].f_name} ได้ขอรีเซ็ตรหัสผ่าน</p>
          <p>รหัส OTP สำหรับรีเซ็ตรหัสผ่าน:</p>
          <div style="background:#f3f4f6;padding:20px;text-align:center;font-size:32px;font-weight:bold;color:#7c3aed;border-radius:8px;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#666;font-size:14px">รหัสนี้จะหมดอายุใน 5 นาที</p>
          <p style="color:#999;font-size:12px">หากคุณไม่ได้ขอรีเซ็ต กรุณาเพิกเฉยต่ออีเมลนี้</p>
        </div>
      `.trim(),
    });

    return res.json({ message: "ส่ง OTP ไปยัง email แล้ว" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ message: "ส่ง OTP ไม่สำเร็จ" });
  }
}

// ─── Reset Password — ตรวจสอบ OTP แล้วเปลี่ยนรหัสผ่าน ──────────────────────
export async function resetPassword(req: Request, res: Response) {
  const { email, otp, new_password } = req.body as {
    email: string; otp: string; new_password: string;
  };
  if (!email || !otp || !new_password) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  }

  try {
    const isValid = await verifyOtp(email.trim(), otp.trim());
    if (!isValid) {
      return res.status(400).json({ message: "OTP ไม่ถูกต้องหรือหมดอายุ" });
    }

    const bcrypt = await import("bcrypt");
    const hashed = await bcrypt.hash(new_password, 10);

    await execute("UPDATE users SET password = ? WHERE email = ?", [hashed, email.trim()]);
    await deleteOtp(email.trim());

    return res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: "เปลี่ยนรหัสผ่านไม่สำเร็จ" });
  }
}
