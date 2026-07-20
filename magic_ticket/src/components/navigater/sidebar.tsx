// src/components/navigater/sidebar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Settings,
  X
} from "lucide-react";

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

  const handleMenuClick = () => {
    // ปิด Sidebar เฉพาะบน Mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // const handleLogout = () => {
  //   Cookies.remove("authToken");
  //   window.location.href = "/signin";
  // };

  return (
    <>
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 h-screen
          bg-neutral-800
          border-r border-white/5
          shadow-xl
          flex flex-col
          transition-transform duration-300 ease-in-out

          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}

          md:relative
          md:translate-x-0
          md:z-auto
          md:flex-shrink-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-xl font-bold text-white">
            Organizer Hub
          </span>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto mt-6 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.link;

            return (
              <Link
                key={item.link}
                to={item.link}
                onClick={handleMenuClick}
                className={`
                  flex items-center gap-3
                  px-4 py-3
                  rounded-lg
                  transition-colors
                  ${
                    isActive
                      ? "bg-violet-600/20 text-white border border-violet-500/30"
                      : "text-gray-400 hover:bg-neutral-700/60 hover:text-white"
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay สำหรับ Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}
