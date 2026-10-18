import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";
import Swal from "sweetalert2";

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch("/email/sendotp", {
        method: "POST",
        body: JSON.stringify({ email, purpose: "password-reset" }),
      });

      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "ส่ง OTP สำเร็จ",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });

      setStep("reset");
    } catch (error) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: error instanceof Error && error.message.trim() ? error.message : "ส่ง OTP ไม่สำเร็จ กรุณาลองใหม่",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, password }),
      });

      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "เปลี่ยนรหัสผ่านสำเร็จ",
        text: "กำลังกลับไปหน้าเข้าสู่ระบบ",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });

      navigate("/signin");
    } catch (error) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: error instanceof Error && error.message.trim() ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-auth-page">
      <div className="top-1/4 left-1/4 absolute bg-purple-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />
      <div className="right-1/4 bottom-1/4 absolute bg-violet-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />

      <div className="mt-auth-card">
        <div className="mb-8 text-center">
          <h2 className="mt-heading font-extrabold text-3xl">ตั้งรหัสผ่านใหม่</h2>
          <p className="mt-2 text-gray-400 text-sm">
            {step === "email"
              ? "กรอกอีเมลเพื่อรับรหัส OTP สำหรับเปลี่ยนรหัสผ่าน"
              : `กรอกรหัส OTP ที่ส่งไปยัง ${email}`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={requestOtp} className="space-y-5">
            <div>
              <label className="mt-label">อีเมล (Email)</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-input"
                placeholder="yourmail@magic.com"
                required
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="disabled:opacity-50 mt-btn-primary py-3 w-full">
              {isSubmitting ? "กำลังส่ง OTP..." : "ส่งรหัส OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <label className="mt-label">รหัส OTP 6 หลัก</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                className="mt-input"
                required
              />
            </div>
            <div>
              <label className="mt-label">รหัสผ่านใหม่</label>
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-input"
                required
              />
            </div>
            <div>
              <label className="mt-label">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-input"
                required
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="disabled:opacity-50 mt-btn-primary py-3 w-full">
              {isSubmitting ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        )}

        <div className="mt-6 text-gray-500 text-xs text-center">
          จำรหัสผ่านได้แล้ว?{" "}
          <Link to="/signin" className="mt-link font-medium underline underline-offset-4">
            กลับเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
