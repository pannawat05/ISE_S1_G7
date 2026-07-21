import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Cookies from "js-cookie";
import { fetchUser, type UserProfile } from "@/api/user";
import { fetchOrganizerEvents } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";

function Dashboards() {
  const { setIsOpen } = useProfileSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) return;

    Promise.all([fetchUser(token), fetchOrganizerEvents(token)])
      .then(([profile, events]) => {
        setUser(profile);
        setStats({
          totalEvents: events.length,
          activeEvents: events.filter(
            (e) => e.status === "approved" && Boolean(e.is_active),
          ).length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const initials = user
    ? `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden text-gray-400 hover:text-white focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-semibold text-white">
            Organizer Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">
              {user?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role ?? "—"}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold border border-white/10">
            {initials}
          </div>
        </div>
      </header>

      <main className="mt-dashboard-main">
        {loading ? (
          <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="mt-stat-card">
                <p className="text-sm text-gray-500 font-medium">Total Events</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalEvents}</p>
              </div>
              <div className="mt-stat-card">
                <p className="text-sm text-gray-500 font-medium">Active Events</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.activeEvents}</p>
              </div>
              <div className="mt-stat-card">
                <p className="text-sm text-gray-500 font-medium">Total Tickets Sold</p>
                <p className="text-3xl font-bold text-white mt-1">—</p>
              </div>
              <div className="mt-stat-card">
                <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">—</p>
              </div>
            </div>

            <div className="mt-surface p-6 h-96 flex items-center justify-center text-gray-500 border-dashed">
              [ Area สำหรับใส่กราฟสถิติ หรือตารางรายชื่อกิจกรรมล่าสุด ]
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboards;
