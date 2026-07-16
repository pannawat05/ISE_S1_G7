import express from 'express';
import dotenv from 'dotenv';
// @ts-ignore: nodemailer has no bundled TypeScript types in this project
import nodemailer from 'nodemailer';

dotenv.config();

const emailRouter = express.Router();

// ตัวเก็บข้อมูล OTP ชั่วคราว (แนะนำให้ใช้ Redis ในอนาคตถ้าทำขึ้นระบบจริง)
// โครงสร้างข้อมูลข้างในจะเป็น: email -> { otp, expiresAt }
const otpStore = new Map();

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * 1. Endpoint สำหรับส่ง OTP
 */
emailRouter.post("/email/sendotp", async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Missing email or otp' });
    }

    // บันทึก OTP และเวลาหมดอายุไว้ในหน่วยความจำ (หมดอายุใน 5 นาที)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { otp: otp.toString(), expiresAt });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Sent OTP ${otp} to email: ${email}`);
        return res.json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error('Error sending email:', err);
        // หากส่งอีเมลไม่สำเร็จ ให้ลบข้อมูลที่บันทึกไว้ออก
        otpStore.delete(email); 
        return res.status(500).json({ error: 'Failed to send OTP' });
    }
});

/**
 * 2. Endpoint สำหรับยืนยัน OTP
 */
emailRouter.post("/email/verifyotp", async (req, res) => {
    const { email, otp } = req.body;

    // ตรวจสอบว่าส่งค่ามาครบถ้วนหรือไม่
    if (!email || !otp) {
        return res.status(400).json({ error: 'Missing email or otp' });
    }

    // ดึงข้อมูล OTP ที่เคยบันทึกไว้ในระบบ
    const record = otpStore.get(email);

    // 1. ตรวจสอบว่ามีข้อมูล OTP ของอีเมลนี้หรือไม่
    if (!record) {
        return res.status(400).json({ error: 'No OTP requested for this email' });
    }

    // 2. ตรวจสอบว่า OTP หมดอายุหรือยัง
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email); // ลบโค้ดที่หมดอายุทิ้ง
        return res.status(400).json({ error: 'OTP has expired' });
    }

    // 3. ตรวจสอบความถูกต้องของ OTP
    if (record.otp !== otp.toString()) {
        return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // หากถูกต้องทั้งหมด ให้ลบ OTP ทิ้งทันทีเพื่อป้องกันการนำมาใช้ซ้ำ (Replay Attack)
    otpStore.delete(email);

    // ส่งข้อความตอบกลับความสำเร็จ (ตรงนี้สามารถเปลี่ยนเป็นการเจน JWT หรือเซ็ต Session ได้)
    return res.json({ message: 'OTP verified successfully' });
});

export default emailRouter;