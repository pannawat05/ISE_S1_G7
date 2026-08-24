import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";

export default function SignUp() {
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!");
      return;
    }

    apiFetch("/email/sendotp", {
      method: "POST",
      body: JSON.stringify({
        email: formData.email,
      }),
    })
      .then((data) => {
        console.log("OTP sent:", data);
        localStorage.setItem("signupData", JSON.stringify(formData));
        window.location.href = "/otp";
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);
        alert("เกิดข้อผิดพลาดในการส่ง OTP กรุณาลองใหม่");
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
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              className="mt-input"
              required
            />
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
            to="/signin"
            className="mt-link font-medium underline underline-offset-4"
          >
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
