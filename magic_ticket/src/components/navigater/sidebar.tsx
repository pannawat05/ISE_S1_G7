import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import Cookies from "js-cookie";

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isSidebarOpen = isOpen ?? internalOpen;
  const setIsSidebarOpen = setIsOpen ?? setInternalOpen;
  const { pathname } = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, link: "/dashboard" },
    { name: "Events", icon: Calendar, link: "/dashboard/events" },
    { name: "Attendees", icon: Users, link: "/dashboard/attendees" },
    { name: "Analytics", icon: BarChart3, link: "/dashboard/analytics" },
    { name: "Settings", icon: Settings, link: "/dashboard/settings" },
  ];

  function handleLogout() {
    Cookies.remove("authToken");
    window.location.href = "/signin";
  }

  return (
    <>
      <aside
        className={`mt-sidebar ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-xl font-bold mt-heading">Organizer Hub</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.link;
            const Icon = item.icon;

            return (
              <Link
                key={item.link}
                to={item.link}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-violet-600/20 text-white border border-purple-500/30"
                    : "text-gray-400 hover:bg-elevated hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-400 hover:bg-elevated hover:text-violet-400 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!isOpen && (
        <div className="p-4 md:hidden fixed top-0 left-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-elevated text-white rounded-lg border border-white/10 cursor-pointer"
          >
            <Menu size={20} />
          </button>
        </div>
      )}
    </>
  );
}
