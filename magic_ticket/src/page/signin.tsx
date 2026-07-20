import { useState } from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch("http://localhost:5001/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
        if (data.token) {
          Cookies.set("authToken", data.token, { path: "/" });
          if (data.role === "organizer") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/";
          }
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      });
  };

  return (
    <div className="mt-auth-page">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="mt-auth-card">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🔮✨</div>
          <h2 className="text-3xl font-extrabold mt-heading">
            ยินดีต้อนรับกลับมา
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            กรุณาเข้าสู่ระบบเพื่อใช้งานบัญชีเวทมนตร์ของคุณ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mt-label">อีเมล (Email)</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="yourmail@magic.com"
              className="mt-input"
            />
          </div>

          <div>
            <label className="mt-label">รหัสผ่าน (Password)</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="mt-input"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 bg-elevated border-white/10 text-violet-600 focus:ring-purple-500/50 focus:ring-offset-0 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-400">
                จดจำฉันไว้
              </label>
            </div>

            <a href="#" className="font-medium mt-link">
              ลืมรหัสผ่าน?
            </a>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 mt-btn-primary transform hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide"
          >
            เปิดประตูมิติเข้าสู่ระบบ 🔮
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
          ยังไม่มีบัญชีใช่ไหม?{" "}
          <Link
            to="/signup"
            className="mt-link font-medium underline underline-offset-4"
          >
            สมัครสมาชิกใหม่ที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signin;
