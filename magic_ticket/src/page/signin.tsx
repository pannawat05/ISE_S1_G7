import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/api/client";
import { fetchUser } from "@/api/user";
import Cookies from "js-cookie";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "login" | "forgot" | "otp" | "reset";

// ─── Main component ───────────────────────────────────────────────────────────
export default function Signin() {
  const [view, setView] = useState<View>("login");
  const [fpEmail, setFpEmail] = useState("");   // forgot password email

  return (
    <div className="mt-auth-page">
      <div className="top-1/4 left-1/4 absolute bg-purple-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />
      <div className="right-1/4 bottom-1/4 absolute bg-violet-600/10 blur-[100px] rounded-full w-80 h-80 pointer-events-none" />

      <div className="mt-auth-card">
        {view === "login"  && <LoginForm  onForgot={() => setView("forgot")} />}
        {view === "forgot" && <ForgotForm email={fpEmail} setEmail={setFpEmail} onNext={() => setView("otp")} onBack={() => setView("login")} />}
        {view === "otp"    && <OtpForm    email={fpEmail} onNext={() => setView("reset")} onBack={() => setView("forgot")} />}
        {view === "reset"  && <ResetForm  email={fpEmail} onDone={() => setView("login")} onBack={() => setView("otp")} />}
      </div>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onForgot }: { onForgot: () => void }) {
  const goto = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const data = await apiFetch<{ message: string; token?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (data.token) {
        Cookies.set("authToken", data.token, { path: "/" });
        localStorage.removeItem("user");
        await fetchUser(data.token);
        window.dispatchEvent(new Event("user-updated"));
        goto("/");
      } else {
        setError(data.message ?? "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="mt-heading font-extrabold text-3xl">ยินดีต้อนรับกลับมา</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--mt-text-secondary)" }}>
          กรุณาเข้าสู่ระบบเพื่อใช้งานบัญชีเวทมนตร์ของคุณ
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 mb-4 px-4 py-3 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mt-label">อีเมล</label>
          <input type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="yourmail@magic.com" className="mt-input" />
        </div>

        <div>
          <label className="mt-label">รหัสผ่าน</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••" className="mt-input pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="top-1/2 right-3 absolute opacity-50 hover:opacity-100 transition-opacity -translate-y-1/2"
              style={{ color: "var(--mt-text-secondary)" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 text-xs">
          <div className="flex items-center gap-2">
            <input id="remember-me" type="checkbox"
              className="bg-elevated border-white/10 rounded focus:ring-violet-500/50 focus:ring-offset-0 w-4 h-4 text-violet-600" />
            <label htmlFor="remember-me" style={{ color: "var(--mt-text-secondary)" }}>จดจำฉันไว้</label>
          </div>
          <button type="button" onClick={onForgot} className="mt-link font-medium">
            ลืมรหัสผ่าน?
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="flex justify-center items-center gap-2 disabled:opacity-50 mt-4 mt-btn-primary py-3 w-full text-sm tracking-wide hover:-translate-y-0.5 active:translate-y-0 transform">
          {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังเข้าสู่ระบบ...</> : "เปิดประตูมิติเข้าสู่ระบบ 🔮"}
        </button>
      </form>

      <div className="mt-6 text-xs text-center" style={{ color: "var(--mt-text-muted)" }}>
        ยังไม่มีบัญชีใช่ไหม?{" "}
        <Link to="/signup" className="mt-link font-medium underline underline-offset-4">
          สมัครสมาชิกใหม่ที่นี่
        </Link>
      </div>
    </>
  );
}

// ─── Forgot Password Form ─────────────────────────────────────────────────────
function ForgotForm({ email, setEmail, onNext, onBack }: {
  email: string; setEmail: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setTimeout(onNext, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 hover:opacity-70 mb-6 text-sm transition-opacity"
        style={{ color: "var(--mt-text-secondary)" }}>
        <ArrowLeft size={16} /> กลับ
      </button>

      <div className="mb-6 text-center">
        <h2 className="font-bold text-xl" style={{ color: "var(--mt-text)" }}>ลืมรหัสผ่าน?</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--mt-text-secondary)" }}>
          กรอก email และเราจะส่ง OTP ไปให้
        </p>
      </div>

      {error && <div className="bg-red-500/10 mb-4 px-4 py-3 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
      {sent && <div className="bg-green-500/10 mb-4 px-4 py-3 border border-green-500/30 rounded-xl text-green-400 text-sm">✅ ส่ง OTP แล้ว กำลังไปหน้าถัดไป...</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mt-label">อีเมล</label>
          <input type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourmail@magic.com" className="mt-input" />
        </div>
        <button type="submit" disabled={loading || sent}
          className="flex justify-center items-center gap-2 disabled:opacity-50 mt-btn-primary py-3 w-full text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังส่ง...</> : "ส่ง OTP"}
        </button>
      </form>
    </>
  );
}

// ─── OTP Verification Form ────────────────────────────────────────────────────
function OtpForm({ email, onNext, onBack }: {
  email: string; onNext: () => void; onBack: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // ตรวจ OTP ผ่าน reset-password endpoint (backend verify OTP ก่อน reset)
      // ใช้ email + otp ตรวจล่วงหน้าโดยส่ง new_password dummy → backend validate OTP
      // จริงๆ ควรมี endpoint verify-otp แยก แต่ใช้ email model ตรวจแทน
      const data = await apiFetch<{ valid?: boolean; message?: string }>("/email/verifyotp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      if ((data as { status?: number }).status === 200 || data.valid) {
        onNext();
      } else {
        setError(data.message ?? "OTP ไม่ถูกต้อง");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP ไม่ถูกต้องหรือหมดอายุ");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 hover:opacity-70 mb-6 text-sm transition-opacity"
        style={{ color: "var(--mt-text-secondary)" }}>
        <ArrowLeft size={16} /> กลับ
      </button>

      <div className="mb-6 text-center">
        <h2 className="font-bold text-xl" style={{ color: "var(--mt-text)" }}>ยืนยัน OTP</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--mt-text-secondary)" }}>
          กรอกรหัส 6 หลักที่ส่งไปยัง <strong>{email}</strong>
        </p>
      </div>

      {error && <div className="bg-red-500/10 mb-4 px-4 py-3 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mt-label">รหัส OTP</label>
          <input type="text" inputMode="numeric" maxLength={6} required
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456" className="mt-input font-mono text-2xl text-center tracking-widest" />
        </div>
        <button type="submit" disabled={loading || otp.length !== 6}
          className="flex justify-center items-center gap-2 disabled:opacity-50 mt-btn-primary py-3 w-full text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังตรวจสอบ...</> : "ยืนยัน OTP"}
        </button>
      </form>
    </>
  );
}

// ─── Reset Password Form ──────────────────────────────────────────────────────
function ResetForm({ email, onDone, onBack }: {
  email: string; onDone: () => void; onBack: () => void;
}) {
  const [form, setForm] = useState({ otp: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("รหัสผ่านไม่ตรงกัน"); return; }
    if (form.password.length < 8) { setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp: form.otp, new_password: form.password }),
      });
      setSuccess(true);
      setTimeout(onDone, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 hover:opacity-70 mb-6 text-sm transition-opacity"
        style={{ color: "var(--mt-text-secondary)" }}>
        <ArrowLeft size={16} /> กลับ
      </button>

      <div className="mb-6 text-center">
        <h2 className="font-bold text-xl" style={{ color: "var(--mt-text)" }}>ตั้งรหัสผ่านใหม่</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--mt-text-secondary)" }}>อย่างน้อย 8 ตัวอักษร</p>
      </div>

      {error && <div className="bg-red-500/10 mb-4 px-4 py-3 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 mb-4 px-4 py-3 border border-green-500/30 rounded-xl text-green-400 text-sm">✅ เปลี่ยนรหัสผ่านสำเร็จ กำลังกลับไปหน้า Login...</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mt-label">OTP (กรอกอีกครั้ง)</label>
          <input type="text" inputMode="numeric" maxLength={6} required
            value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}
            placeholder="123456" className="mt-input font-mono" />
        </div>
        <div>
          <label className="mt-label">รหัสผ่านใหม่</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} required minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="อย่างน้อย 8 ตัวอักษร" className="mt-input pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="top-1/2 right-3 absolute opacity-50 hover:opacity-100 -translate-y-1/2"
              style={{ color: "var(--mt-text-secondary)" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="mt-label">ยืนยันรหัสผ่านใหม่</label>
          <input type={showPw ? "text" : "password"} required
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            placeholder="••••••••" className="mt-input" />
        </div>
        <button type="submit" disabled={loading || success}
          className="flex justify-center items-center gap-2 disabled:opacity-50 mt-btn-primary py-3 w-full text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" /> กำลังเปลี่ยน...</> : "เปลี่ยนรหัสผ่าน"}
        </button>
      </form>
    </>
  );
}
