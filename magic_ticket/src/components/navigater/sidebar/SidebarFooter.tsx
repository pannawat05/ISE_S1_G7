import { Link } from "react-router-dom";
import { CircleUser, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import Cookies from "js-cookie";

interface SidebarFooterProps {
  onLinkClick?: () => void;
}

export default function SidebarFooter({ onLinkClick }: SidebarFooterProps) {
  const { pathname } = useLocation();
  const isActive = pathname === "/profile/account";

  function handleLogout() {
    Cookies.remove("authToken");
    localStorage.removeItem("user");
    window.location.href = "/signin";
  }

  return (
    <div className="bottom-0 absolute space-y-1 p-4 border-white/5 border-t w-full">
      {/* Account — never locked */}
      <Link
        to="/profile/account"
        onClick={onLinkClick}
        className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
          isActive
            ? "border border-purple-500/30 bg-violet-600/20 text-white"
            : "text-gray-400 hover:bg-elevated hover:text-white"
        }`}
      >
        <CircleUser size={20} className="shrink-0" />
        <span className="font-medium">บัญชีของฉัน</span>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center space-x-3 hover:bg-elevated px-4 py-3 rounded-lg w-full text-gray-400 hover:text-violet-400 transition-colors cursor-pointer"
      >
        <LogOut size={20} className="shrink-0" />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
}
