import type { Request, Response } from "express";
// @ts-expect-error nodemailer has no bundled types in this project
import nodemailer from "nodemailer";
import { deleteOtp, saveOtp, verifyOtp } from "../model/email.model.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtp(req: Request, res: Response) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Missing email or otp", status: 400 });
  }

  saveOtp(email, otp.toString());

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.json({ message: "OTP sent successfully", status: 200 });
  } catch (err) {
    console.error("Error sending email:", err);
    deleteOtp(email);
    return res.status(500).json({ error: "Failed to send OTP", status: 500 });
  }
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Missing email or otp", status: 400 });
  }

  const error = verifyOtp(email, otp.toString());

  if (error) {
    return res.status(400).json({ error, status: 400 });
  }

  return res.json({ message: "OTP verified successfully", status: 200 });
}
