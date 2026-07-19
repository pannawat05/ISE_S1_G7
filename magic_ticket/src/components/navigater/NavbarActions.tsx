import { Bell, LogOut, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";

export default function NavbarActions() {
  const token = Cookies.get("authToken");

  function handleLogout() {
    Cookies.remove("authToken");
    window.location.reload();
  }

  if (!token) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/signin"
          className="mt-btn-outline px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full"
        >
          เข้าสู่ระบบ
        </Link>
        <Link
          to="/signup"
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm mt-btn-primary rounded-full"
        >
          สมัครสมาชิก
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button className="hidden lg:flex items-center gap-2 px-3 py-2 text-xs font-medium text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full hover:bg-violet-400/20 transition-all">
        <Zap size={14} />
        สลับบทบาทจำลอง
      </button>

      <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
        <Bell size={20} />
        <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
          2
        </span>
      </button>

      <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
          alt="User avatar"
          className="w-8 h-8 rounded-full bg-purple-900/50 border border-white/10"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-white">พิศณุพงศ์ นวลเครือ</span>
        </div>
      </div>

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
