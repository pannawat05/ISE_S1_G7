import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
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

  async function handleLogout() {
    const result = await Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบใช่หรือไม่",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
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
      {/* Admin badge — visible only for admin role */}
      {(isAdmin || isSysAdmin) && (
        <Link
          to="/admin"
          className="hidden sm:flex items-center gap-1.5 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 border border-violet-300 rounded-full font-semibold text-violet-700 text-xs transition-colors"
        >
          <ShieldCheck size={14} />
          {user?.role}
        </Link>
      )}

      <Link to="/profile/account">
        <div className="hidden sm:flex items-center gap-2 pl-2 border-purple-200 border-l">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
            alt="User avatar"
            className="bg-purple-100 border border-purple-200 rounded-full w-8 h-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-gray-900 text-xs">{fullname}</span>
            {(isAdmin || isSysAdmin) && (
              <span className="font-semibold text-[10px] text-violet-700">{user?.role}</span>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={handleLogout}
        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
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
      <Link to="/signin" className="bg-white hover:bg-purple-50 px-3 sm:px-4 py-2 border border-gray-300 rounded-full font-medium text-gray-900 text-xs sm:text-sm transition-colors">
        เข้าสู่ระบบ
      </Link>
      <Link to="/signup" className="mt-btn-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm">
        สมัครสมาชิก
      </Link>
    </div>
  );
}
