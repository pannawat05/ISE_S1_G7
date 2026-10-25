import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { fetchUser } from "@/api/user";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

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

  const goto = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  const signupUrl = safeRedirect === "/"
    ? "/signup"
    : `/signup?redirect=${encodeURIComponent(safeRedirect)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apiFetch<{ message: string; token?: string; role?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(formData),
    })
      .then(async (data) => {
        if (data.token) {
          Cookies.set("authToken", data.token, { path: "/" });
          // Pre-fetch user so Navbar can read it immediately
          localStorage.removeItem("user");
          await fetchUser(data.token);
          // Notify Navbar to re-read localStorage
          window.dispatchEvent(new Event("user-updated"));
          goto(safeRedirect);
        } else {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: data.message || "เข้าสู่ระบบไม่สำเร็จ",
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
          });
        }
      })
      .catch((error: unknown) => {
        console.error("Error:", error);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title:
            error instanceof Error && error.message.trim()
              ? error.message
              : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
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
          {/* <div className="mb-2 text-3xl">🔮✨</div> */}
          <h2 className="mt-heading font-extrabold text-3xl">
            ยินดีต้อนรับกลับมา
          </h2>
          <p className="mt-2 text-gray-400 text-sm">
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

          <div className="flex justify-between items-center pt-1 text-xs">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="bg-elevated border-white/10 rounded focus:ring-purple-500/50 focus:ring-offset-0 w-4 h-4 text-violet-600"
              />
              <label htmlFor="remember-me" className="block ml-2 text-gray-400">
                จดจำฉันไว้
              </label>
            </div>

            <Link to="/forgot-password" className="mt-link font-medium">
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button
            type="submit"
            className="mt-4 mt-btn-primary py-3 w-full text-sm tracking-wide hover:-translate-y-0.5 active:translate-y-0 transform"
          >
            เปิดประตูมิติเข้าสู่ระบบ 🔮
          </button>
        </form>

        <div className="mt-6 text-gray-500 text-xs text-center">
          ยังไม่มีบัญชีใช่ไหม?{" "}
          <Link
            to={signupUrl}
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
