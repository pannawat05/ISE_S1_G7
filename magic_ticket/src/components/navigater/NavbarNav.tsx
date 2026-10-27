import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Ticket, ShieldCheck, QrCode } from "lucide-react";
import Cookies from "js-cookie";
import { fetchMyStaffAssignments } from "@/api/user";

const BASE_NAV = [
  { to: "/",           label: "ค้นหากิจกรรม", icon: CalendarDays },
  { to: "/my-tickets", label: "ตั๋วของฉัน",    icon: Ticket },
];

const AUTH_NAV = [
  { to: "/my-staff", label: "Staff",      icon: ShieldCheck },
  { to: "/scan-qr",  label: "Scan QR",    icon: QrCode },
];

interface NavbarNavProps {
  /** เรียกเมื่อคลิก link ใน mobile sidebar */
  onNavigate?: () => void;
  /** ถ้า true = render ใน sidebar (vertical) ถ้า false = render inline desktop */
  mobile?: boolean;
}

export default function NavbarNav({ onNavigate, mobile = false }: NavbarNavProps) {
  const { pathname } = useLocation();
  const [token, setToken] = useState(() => Cookies.get("authToken") ?? null);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function sync() {
      const currentRequest = ++requestId;
      const nextToken = Cookies.get("authToken") ?? null;
      setToken(nextToken);
      setIsStaff(false);

      if (!nextToken) return;

      try {
        const assignments = await fetchMyStaffAssignments(nextToken);
        if (active && currentRequest === requestId) setIsStaff(assignments.length > 0);
      } catch {
        if (active && currentRequest === requestId) setIsStaff(false);
      }
    }

    void sync();
    window.addEventListener("user-updated", sync);
    window.addEventListener("staff-assignments-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("user-updated", sync);
      window.removeEventListener("staff-assignments-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const navItems = token
    ? [...BASE_NAV, ...(isStaff ? AUTH_NAV : [])]
    : BASE_NAV;

  if (mobile) {
    // Sidebar vertical list
    return (
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-gray-600 hover:bg-purple-50 hover:text-purple-700 border border-transparent"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop horizontal — แสดงตั้งแต่ lg ขึ้นไป
  return (
    <div className="hidden lg:flex items-center gap-2">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-all ${
              isActive
                ? "border-[color:var(--mt-border)] bg-[color:var(--mt-elevated)] text-[color:var(--mt-text)]"
                : "border-transparent text-[color:var(--mt-text-secondary)] hover:text-[color:var(--mt-text)]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
