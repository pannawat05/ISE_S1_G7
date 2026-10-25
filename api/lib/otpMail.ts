import { randomInt } from "node:crypto";
import { transporter } from "./mailer.js";
import { deleteOtp, saveOtp } from "../model/email.model.js";

export async function sendOtpEmail(
  email: string,
  purpose: "signup" | "password-reset" | "account-setup",
): Promise<void> {
  const otp = randomInt(100000, 1000000).toString();
  const isAccountSetup = purpose === "account-setup";
  const isPasswordReset = purpose === "password-reset" || isAccountSetup;

  await saveOtp(email, otp);
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Magic Ticket - ${isAccountSetup ? "ตั้งค่าบัญชี" : isPasswordReset ? "รหัส OTP สำหรับเปลี่ยนรหัสผ่าน" : "รหัส OTP ของคุณ"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto">
          <h2 style="color: #7c3aed">Magic Ticket</h2>
          <p>${isAccountSetup ? "ผู้จัดงานสร้างบัญชี Magic Ticket ให้คุณ กรอกอีเมลและใช้รหัสนี้ในหน้า “ลืมรหัสผ่าน” เพื่อกำหนดรหัสผ่าน:" : isPasswordReset ? "รหัส OTP สำหรับเปลี่ยนรหัสผ่านของคุณ:" : "รหัส OTP สำหรับยืนยันการสมัครสมาชิก:"}</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #7c3aed; border-radius: 8px; margin: 20px 0">${otp}</div>
          <p style="color: #666; font-size: 14px">รหัสนี้จะหมดอายุใน 5 นาที</p>
          <p style="color: #999; font-size: 12px">${isAccountSetup ? "ในหน้าลืมรหัสผ่าน เลือก “มี OTP แล้ว” หากรหัสหมดอายุ ให้กลับมาขอรหัสใหม่" : "หากคุณไม่ได้ส่งคำขอนี้ กรุณาเพิกเฉยต่ออีเมลนี้"}</p>
        </div>
      `,
    });
  } catch (error) {
    await deleteOtp(email);
    throw error;
  }
}
