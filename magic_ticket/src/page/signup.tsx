import { useState } from "react";
import { Link } from "react-router-dom";

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

    fetch("http://localhost:5001/email/sendotp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        otp: Math.floor(100000 + Math.random() * 900000),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        localStorage.setItem("signupData", JSON.stringify(formData));
        window.location.href = "/otp";
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  return (
    <div className="mt-auth-page">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="mt-auth-card">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">✨🧙‍♂️</div>
          <h2 className="text-3xl font-extrabold mt-heading">
            สร้างบัญชีเวทมนตร์
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            เข้าร่วมการเดินทางข้ามมิติไปกับเรา
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            className="w-full mt-4 py-3 mt-btn-primary transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide"
          >
            ร่ายมนตร์สมัครสมาชิก 🔮
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
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
