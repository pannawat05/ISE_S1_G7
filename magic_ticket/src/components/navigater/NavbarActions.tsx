import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import Cookies from "js-cookie";
import type { UserProfile } from "@/api/user";

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

  // Re-read whenever localStorage changes (e.g. after login/update from another tab or same page)
  useEffect(() => {
    function sync() {
      setToken(Cookies.get("authToken"));
      setUser(readUserFromStorage());
    }

    // Custom event dispatched by signin + updateProfile
    window.addEventListener("user-updated", sync);
    // Standard storage event (cross-tab)
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

  return (
    <div className="flex items-center gap-3">
      <Link to="/profile/account">
        <div className="hidden sm:flex items-center gap-2 pl-2 border-white/10 border-l">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
            alt="User avatar"
            className="bg-purple-900/50 border border-white/10 rounded-full w-8 h-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-white text-xs">{fullname}</span>
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
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link to="/signin" className="px-3 sm:px-4 py-2 rounded-full mt-btn-outline text-xs sm:text-sm">
        เข้าสู่ระบบ
      </Link>
      <Link to="/signup" className="mt-btn-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm">
        สมัครสมาชิก
      </Link>
    </div>
  );
}
