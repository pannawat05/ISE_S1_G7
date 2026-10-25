import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { validateBulkTicketInvitation } from "@/api/events";
import Swal from "sweetalert2";

export default function SignUp() {
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  useEffect(() => {
    const invitationMatch = safeRedirect.match(/^\/events\/(\d+)\?ticket_invite=([^&]+)/);
    if (!invitationMatch?.[1] || !invitationMatch[2]) return;
    validateBulkTicketInvitation(Number(invitationMatch[1]), invitationMatch[2])
      .then((invitation) => {
        setInvitedEmail(invitation.invited_email);
        setFormData((previous) => ({ ...previous, email: invitation.invited_email }));
      })
      .catch(() => setInvitedEmail(null));
  }, [safeRedirect]);
  const signinUrl = safeRedirect === "/"
    ? "/signin"
    : `/signin?redirect=${encodeURIComponent(safeRedirect)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        toast: true,
        position: "top",
        icon: "error",
        title: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
      return;
    }

    apiFetch<{ message?: string }>("/email/sendotp", {
      method: "POST",
      body: JSON.stringify({
        email: formData.email,
      }),
    })
      .then(async (data) => {
        await Swal.fire({
          toast: true,
          position: "top",
          icon: "success",
          title: data.message || "ส่ง OTP สำเร็จ",
          text: "กรุณาตรวจสอบอีเมลของคุณ",
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });

        console.log("OTP sent:", data);
        localStorage.setItem("signupData", JSON.stringify(formData));
        const otpUrl = safeRedirect === "/"
          ? "/otp"
          : `/otp?redirect=${encodeURIComponent(safeRedirect)}`;
        window.location.href = otpUrl;
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);

        Swal.fire({
          toast: true,
          position: "top",
          icon: "error",
          title: error.message || "เกิดข้อผิดพลาดในการส่ง OTP กรุณาลองใหม่",
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
        });
      });
  };

  return (
    <div className="mt-auth-page">
      <div className="top-1/4 left-1/4 absolute bg-purple-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />
      <div className="right-1/4 bottom-1/4 absolute bg-violet-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />

      <div className="mt-auth-card">
        <div className="mb-8 text-center">
          {/* <div className="mb-2 text-3xl">✨🧙‍♂️</div> */}
          <h2 className="mt-heading font-extrabold text-3xl">
            สร้างบัญชีเวทมนตร์
          </h2>
          <p className="mt-2 text-gray-400 text-sm">
            เข้าร่วมการเดินทางข้ามมิติไปกับเรา
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="gap-4 grid grid-cols-2">
            <div>
              <label className="mt-label">ชื่อจริง</label>
              <input
                type="text"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                placeholder="สมชาย"
                className="mt-input"
                required
              />
            </div>
            <div>
              <label className="mt-label">นามสกุล</label>
              <input
                type="text"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                placeholder="สายเสก"
                className="mt-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="mt-label">อีเมล (Email)</label>
            <input
              type="email"
              name="email"
              readOnly={invitedEmail !== null}
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              className="mt-input"
              required
            />
            {invitedEmail && (
              <p className="mt-1 text-gray-500 text-xs">
                ใช้อีเมลสมาชิกที่ได้รับคำเชิญ: {invitedEmail}
              </p>
            )}
          </div>

          <div>
            <label className="mt-label">รหัสผ่าน (Password)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="mt-input"
              required
            />
          </div>

          <div>
            <label className="mt-label">ยืนยันรหัสผ่าน (Confirm Password)</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="mt-input"
              required
            />
          </div>

          <button
            type="submit"
            className="mt-4 mt-btn-primary py-3 w-full text-sm tracking-wide hover:-translate-y-0.5 active:translate-y-0 transform"
          >
            ร่ายมนตร์สมัครสมาชิก 🔮
          </button>
        </form>

        <div className="mt-6 text-gray-500 text-xs text-center">
          มีบัญชีอยู่แล้วใช่ไหม?{" "}
          <Link
            to={signinUrl}
            className="mt-link font-medium underline underline-offset-4"
          >
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
