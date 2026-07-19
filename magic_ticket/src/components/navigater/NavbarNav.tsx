import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Ticket } from "lucide-react";

const navItems = [
  { to: "/", label: "ค้นหากิจกรรม", icon: CalendarDays },
  { to: "/my-tickets", label: "ตั๋วของฉัน", icon: Ticket },
];

export default function NavbarNav() {
  const { pathname } = useLocation();

  return (
    <div className="hidden md:flex items-center gap-2">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to;

        return (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-full border transition-all ${
              isActive
                ? "text-white bg-white/10 border-white/20"
                : "text-gray-300 bg-[#1a1a1a] border-white/10 hover:border-purple-500/40 hover:text-white"
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
