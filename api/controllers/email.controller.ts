import type { Request, Response } from "express";
import { sendOtpEmail } from "../lib/otpMail.js";
import { verifyOtp } from "../model/email.model.js";

export async function sendOtp(req: Request, res: Response) {
  const { email, purpose } = req.body;
  const isPasswordReset = purpose === "password-reset";

  if (!email) {
    return res.status(400).json({
      error: "Missing email",
      status: 400,
    });
  }

  try {
    await sendOtpEmail(email, isPasswordReset ? "password-reset" : "signup");

    return res.status(200).json({
      message: "OTP sent successfully",
      status: 200,
    });
  } catch (err) {
    console.error("Error sending OTP email:", err);

    return res.status(500).json({
      error: "Failed to send OTP",
      status: 500,
    });
  }
}

export async function verifyOtpHandler(
  req: Request,
  res: Response
) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      error: "Missing email or otp",
      status: 400,
    });
  }

  try {
    const error = await verifyOtp(
      email,
      otp.toString()
    );

    if (error) {
      return res.status(400).json({
        error,
        status: 400,
      });
    }

    return res.status(200).json({
      message: "OTP verified successfully",
      status: 200,
    });
  } catch (err) {
    console.error(
      "OTP verification error:",
      err
    );

    return res.status(500).json({
      error: "Internal server error",
      status: 500,
    });
  }
}