import { Bell, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";
import type { UserProfile } from "@/api/user";

export default function NavbarActions() {
  const token = Cookies.get("authToken");
  const link = "/profile/account"

  if (!token) {
    return <AuthenNav />
  }

  function handleLogout() {
    Cookies.remove("authToken");
    localStorage.clear();
    window.location.reload();
  }

  const user: UserProfile = JSON.parse(localStorage.getItem("user") || "{}");
  const get_fullname = () => {
    return user.firstname + " " + user.lastname;
  };

  return (
    <div className="flex items-center gap-3">
      {/* <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
        <Bell size={20} />
      </button> */}

      <Link key={link} to={link}>
        <div className="hidden sm:flex items-center gap-2 pl-2 border-white/10 border-l">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
            alt="User avatar"
            className="bg-purple-900/50 border border-white/10 rounded-full w-8 h-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-white text-xs">{get_fullname()}</span>
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
      <Link
        to="/signin"
        className="px-3 sm:px-4 py-2 rounded-full mt-btn-outline text-xs sm:text-sm"
      >
        เข้าสู่ระบบ
      </Link>
      <Link
        to="/signup"
        className="mt-btn-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm"
      >
        สมัครสมาชิก
      </Link>
    </div>
  );
}