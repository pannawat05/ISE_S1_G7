import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import Cookies from "js-cookie";
import type { UserProfile } from "@/api/user";
import { useTheme } from "@/hooks/useTheme";

function readUserFromStorage(): UserProfile | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function NavbarActions() {
  const [token, setToken] = useState<string | undefined>(() => Cookies.get("authToken"));
  const [user, setUser] = useState<UserProfile | null>(readUserFromStorage);
  const { isDarkMode, toggleTheme } = useTheme();
  useEffect(() => {
    function sync() {
      setToken(Cookies.get("authToken"));
      setUser(readUserFromStorage());
    }
    window.addEventListener("user-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("user-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!token) return <AuthenNav />;

  function handleLogout() {
    Cookies.remove("authToken");
    localStorage.clear();
    setToken(undefined);
    setUser(null);
    window.location.href = "/";
  }

  const fullname = user ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() : "—";
  const isAdmin = user?.role === "admin";
  const isSysAdmin = user?.role === "sysadmin";

  return (
    <div className="flex items-center gap-3">
      {/* Theme toggle — ปิดชั่วคราว */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-colors"
        style={{ color: "var(--mt-text-secondary)" }}
        aria-label="Toggle theme"
        title={isDarkMode ? "สลับเป็น Light Mode" : "สลับเป็น Dark Mode"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
     

      {/* Admin badge */}
      {(isAdmin || isSysAdmin) && (
        <Link
          to="/admin"
          className="hidden sm:flex items-center gap-1.5 bg-violet-600/10 hover:bg-violet-600/20 px-3 py-1.5 border border-violet-500/40 rounded-full font-semibold text-violet-500 text-xs transition-colors"
        >
          <ShieldCheck size={14} />
          {user?.role}
        </Link>
      )}

      <Link to="/profile/account">
        <div className="hidden sm:flex items-center gap-2 pl-2 border-white/10 border-l">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
            alt="User avatar"
            className="bg-purple-900/50 border border-white/10 rounded-full w-8 h-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-white text-xs">{fullname}</span>
            {(isAdmin || isSysAdmin) && (
              <span className="font-medium text-[10px] text-violet-400">{user?.role}</span>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={handleLogout}
        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        aria-label="Logout"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}

function AuthenNav() {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Theme toggle — ปิดชั่วคราว
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-colors"
        style={{ color: "var(--mt-text-secondary)" }}
        aria-label="Toggle theme"
        title={isDarkMode ? "สลับเป็น Light Mode" : "สลับเป็น Dark Mode"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      */}
      <Link to="/signin" className="px-3 sm:px-4 py-2 rounded-full mt-btn-outline text-xs sm:text-sm">
        เข้าสู่ระบบ
      </Link>
      <Link to="/signup" className="mt-btn-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm">
        สมัครสมาชิก
      </Link>
    </div>
  );
}
