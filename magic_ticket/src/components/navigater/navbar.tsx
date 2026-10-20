import { useState, useEffect } from "react";
import { X, ShieldCheck, LayoutDashboard, PanelLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import NavbarActions from "./NavbarActions";
import NavbarBrand from "./NavbarBrand";
import NavbarNav from "./NavbarNav";
import Cookies from "js-cookie";
import type { UserProfile } from "@/api/user";

function readUser(): UserProfile | null {
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); } catch { return null; }
}

export const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(readUser);

  useEffect(() => {
    function sync() { setUser(readUser()); }
    window.addEventListener("user-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("user-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ล็อก scroll body เมื่อ sidebar เปิด
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  const { pathname } = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "sysadmin";
  const token = Cookies.get("authToken");
  const fullname = user ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() : "";

  return (
    <>
      <nav className="top-0 z-50 sticky bg-white/80 backdrop-blur-md px-4 sm:px-6 py-4 border-purple-100 border-b-2 w-full">
        <div className="flex items-center gap-3 mx-auto max-w-7xl">

          {/* Burger — ด้านซ้าย ซ่อนตั้งแต่ lg */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden hover:bg-purple-50 p-2 rounded-lg text-gray-600 hover:text-purple-950 transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={22} /> : <PanelLeft size={22} />}
          </button>

          {/* Brand */}
          <NavbarBrand />

          {/* Desktop nav — lg ขึ้นไป */}
          <div className="flex flex-1 justify-center">
            <NavbarNav />
          </div>

          {/* Right: actions */}
          <NavbarActions />
        </div>
      </nav>

      {/* ── Mobile / Tablet Sidebar ── */}

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden z-[60] fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Slide-in panel จากซ้าย */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 z-[70] h-full w-72 max-w-[85vw]
          bg-white shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-purple-100 border-b">
          <NavbarBrand />
          <button
            type="button"
            onClick={closeSidebar}
            className="hover:bg-purple-50 p-2 rounded-lg text-gray-500 hover:text-purple-950 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info + role badge (ถ้า login อยู่) */}
        {token && user && (
          <Link
            to="/profile/account"
            onClick={closeSidebar}
            className="flex items-center gap-3 bg-purple-50/40 hover:bg-purple-100/60 px-5 py-4 border-purple-50 border-b transition-colors"
          >
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=customer"
              alt="avatar"
              className="bg-purple-100 border border-purple-200 rounded-full w-10 h-10 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-purple-950 text-sm truncate">{fullname || "—"}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 bg-violet-100 mt-0.5 px-2 py-0.5 border border-violet-200 rounded-full font-semibold text-[11px] text-violet-700">
                  <ShieldCheck size={11} />
                  {user.role}
                </span>
              )}
            </div>
          </Link>
        )}

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto">
          <NavbarNav mobile onNavigate={closeSidebar} />

          {/* Admin Dashboard — เฉพาะ admin / sysadmin */}
          {isAdmin && (
            <div className="px-4 pb-4">
              <div className="mb-2 px-4 font-semibold text-[10px] text-gray-400 uppercase tracking-widest">
                Admin
              </div>
              <Link
                to="/admin"
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
                  pathname === "/admin"
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : "text-gray-600 border-transparent hover:bg-violet-50 hover:text-violet-700"
                }`}
              >
                <LayoutDashboard size={20} />
                Admin Dashboard
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
