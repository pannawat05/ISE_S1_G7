import type { Response } from "express";
import type { AuthRequest } from "../middlewares/types.js";
import { getUserProfile, getUserOrganizers, updateUser, findUserByEmail } from "../model/user.model.js";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: profile.id,
      name: `${profile.firstname} ${profile.lastname}`.trim(),
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.email,
      role: profile.role,
    });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyOrganizers(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const organizers = await getUserOrganizers(req.user.id);
    return res.json({ organizers });
  } catch (err) {
    console.error("GET MY ORGANIZERS ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { firstname, lastname, email } = req.body as {
    firstname?: string;
    lastname?: string;
    email?: string;
  };

  const trimmedEmail = email?.trim().toLowerCase();

  // Validate email format if provided
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }

  try {
    // If email is changing, check it's not already taken
    if (trimmedEmail) {
      const existing = await findUserByEmail(trimmedEmail);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    await updateUser(req.user.id, {
      ...(firstname?.trim() ? { f_name: firstname.trim() } : {}),
      ...(lastname?.trim() ? { l_name: lastname.trim() } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    });

    // Fetch updated profile
    const profile = await getUserProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: profile.id,
      name: `${profile.firstname} ${profile.lastname}`.trim(),
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.email,
      role: profile.role,
    });
  } catch (err) {
    console.error("UPDATE ME ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
