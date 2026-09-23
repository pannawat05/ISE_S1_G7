import type { Request, Response } from "express";
import { transporter } from "../lib/mailer.js";
import {
  deleteOtp,
  saveOtp,
  verifyOtp,
} from "../model/email.model.js";

export async function sendOtp(req: Request, res: Response) {
  const { email, purpose } = req.body;
  const isPasswordReset = purpose === "password-reset";

  if (!email) {
    return res.status(400).json({
      error: "Missing email",
      status: 400,
    });
  }

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  try {
    await saveOtp(email, otp);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Magic Ticket - ${isPasswordReset ? "รหัส OTP สำหรับเปลี่ยนรหัสผ่าน" : "รหัส OTP ของคุณ"}`,
      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
          "
        >
          <h2 style="color: #7c3aed;">
            🎫 Magic Ticket
          </h2>

          <p>
            ${isPasswordReset ? "รหัส OTP สำหรับเปลี่ยนรหัสผ่านของคุณ:" : "รหัส OTP สำหรับยืนยันการสมัครสมาชิก:"}
          </p>

          <div
            style="
              background: #f3f4f6;
              padding: 20px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              color: #7c3aed;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            ${otp}
          </div>

          <p
            style="
              color: #666;
              font-size: 14px;
            "
          >
            รหัสนี้จะหมดอายุใน 5 นาที
          </p>

          <p
            style="
              color: #999;
              font-size: 12px;
            "
          >
            หากคุณไม่ได้ส่งคำขอนี้
            กรุณาเพิกเฉยต่ออีเมลนี้
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "OTP sent successfully",
      status: 200,
    });
  } catch (err) {
    console.error(
      "Error sending OTP email:",
      err
    );

    try {
      await deleteOtp(email);
    } catch (deleteError) {
      console.error(
        "Error deleting OTP:",
        deleteError
      );
    }

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