import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Ticket,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchUser } from "@/api/user";

const BASE_NAV = [
  {
    to: "/",
    label: "ค้นหากิจกรรม",
    icon: CalendarDays,
  },
  {
    to: "/my-tickets",
    label: "ตั๋วของฉัน",
    icon: Ticket,
  },
];

const AUTH_NAV = [
  {
    to: "/my-staff",
    label: "Staff",
    icon: ShieldCheck,
  },
  {
    to: "/scan-qr",
    label: "Scan QR",
    icon: QrCode,
  },
];

export default function NavbarNav() {
  const { pathname } = useLocation();

  const [loggedIn, setLoggedIn] = useState(
    !!Cookies.get("authToken")
  );

  const [canAccessStaff, setCanAccessStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncUser() {
      const token = Cookies.get("authToken");

      // ยังไม่ได้ login
      if (!token) {
        if (!cancelled) {
          setLoggedIn(false);
          setCanAccessStaff(false);
        }

        return;
      }

      if (!cancelled) {
        setLoggedIn(true);
      }

      try {
        // ดึง permission ล่าสุดจาก DB
        const user = await fetchUser(token);

        if (cancelled) return;

        if (!user) {
          setCanAccessStaff(false);
          return;
        }

        /*
         * Organizer:
         * organizers.owner_id = users.id
         *
         * Staff:
         * staff.users_id = users.id
         */
        const canAccess =
          user.is_organizer === true ||
          user.is_staff === true;

        setCanAccessStaff(canAccess);
      } catch (error) {
        console.error(
          "CHECK USER PERMISSION ERROR:",
          error
        );

        if (!cancelled) {
          setCanAccessStaff(false);
        }
      }
    }

    syncUser();

    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "user-updated",
        syncUser
      );

      window.removeEventListener(
        "storage",
        syncUser
      );
    };
  }, []);

  /*
   * แสดง Staff + Scan QR
   * เฉพาะ Organizer หรือ Staff
   */
  const navItems =
    loggedIn && canAccessStaff
      ? [...BASE_NAV, ...AUTH_NAV]
      : BASE_NAV;

  return (
    <div className="hidden md:flex items-center gap-2">
      {navItems.map(
        ({ to, label, icon: Icon }) => {
          const isActive =
            pathname === to ||
            (to !== "/" &&
              pathname.startsWith(to));

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
        }
      )}
    </div>
  );
}
