import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Ticket, ShieldCheck, QrCode } from "lucide-react";
import Cookies from "js-cookie";

const BASE_NAV = [
  { to: "/",           label: "ค้นหากิจกรรม", icon: CalendarDays },
  { to: "/my-tickets", label: "ตั๋วของฉัน",    icon: Ticket },
];

const AUTH_NAV = [
  { to: "/my-staff", label: "Staff",      icon: ShieldCheck },
  { to: "/scan-qr",  label: "Scan QR",    icon: QrCode },
];
export default function NavbarNav() {
  const { pathname } = useLocation();
  const [loggedIn, setLoggedIn] = useState(!!Cookies.get("authToken"));

  useEffect(() => {
    function sync() { setLoggedIn(!!Cookies.get("authToken")); }
    window.addEventListener("user-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("user-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const navItems = loggedIn
    ? [...BASE_NAV, ...AUTH_NAV]
    : BASE_NAV;

  return (
    <div className="hidden md:flex items-center gap-2">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-all ${
              isActive
                ? "text-white bg-white/10 border-white/20"
                : "text-gray-300 border-none hover:text-white"
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
