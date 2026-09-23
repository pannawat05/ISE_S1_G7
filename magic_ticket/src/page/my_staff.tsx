import { useState, useEffect } from "react";
import { ShieldCheck, Calendar, MapPin, Building2, Loader2, Users } from "lucide-react";
import Cookies from "js-cookie";
import { fetchMyStaffAssignments, type StaffAssignment } from "@/api/user";
import { API_BASE } from "@/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STAFF_ROLE_LABEL: Record<string, string> = {
  general_staff: "Staff ทั่วไป", manager: "Manager",
};
const EVENT_ROLE_LABEL: Record<string, string> = {
  checkin: "Check-in", security: "Security",
  registration: "Registration", backstage: "Backstage", manager: "Manager",
};
const EVENT_ROLE_COLOR: Record<string, string> = {
  checkin:      "bg-green-500/20 text-green-300 border-green-500/30",
  security:     "bg-red-500/20   text-red-300   border-red-500/30",
  registration: "bg-blue-500/20  text-blue-300  border-blue-500/30",
  backstage:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  manager:      "bg-amber-500/20 text-amber-300  border-amber-500/30",
};
const LIFECYCLE_BADGE: Record<string, string> = {
  live:     "bg-green-500/15 text-green-400 border-green-500/30",
  upcoming: "bg-blue-500/15  text-blue-400  border-blue-500/30",
  ended:    "bg-gray-500/10  text-gray-500  border-gray-500/20",
};
const LIFECYCLE_LABEL: Record<string, string> = {
  live: "🟢 Live", upcoming: "🔵 Upcoming", ended: "⚪ Ended",
};

function eventLifecycle(start: string | null, end: string | null, status: string | null) {
  if (!start || !end || status === "deleted") return "ended";
  const now = new Date();
  if (new Date(end) < now)   return "ended";
  if (new Date(start) > now) return "upcoming";
  return "live";
}

interface OrgGroup {
  organizer_id: number; organizer_name: string;
  organizer_logo: string | null; staff_role: string;
  events: StaffAssignment[];
}

function groupByOrganizer(data: StaffAssignment[]): OrgGroup[] {
  const map = new Map<number, OrgGroup>();
  for (const a of data) {
    if (!map.has(a.organizer_id)) {
      map.set(a.organizer_id, {
        organizer_id: a.organizer_id,
        organizer_name: a.organizer_name,
        organizer_logo: a.organizer_logo,
        staff_role: a.staff_role,
        events: [],
      });
    }
    if (a.event_id) map.get(a.organizer_id)!.events.push(a);
  }
  return Array.from(map.values());
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ a }: { a: StaffAssignment }) {
  const lifecycle = eventLifecycle(a.start_date, a.end_date, a.event_status);
  const coverSrc = a.cover_image
    ? (a.cover_image.startsWith("http") ? a.cover_image : `${API_BASE}${a.cover_image}`)
    : null;
  const startDate = a.start_date ? new Date(a.start_date) : null;
  const dateStr = startDate?.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = startDate?.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3 bg-white/[0.02] p-3 border border-white/5 rounded-xl">
      {coverSrc ? (
        <img src={coverSrc} alt={a.event_name ?? ""} className="border border-white/10 rounded-lg w-14 h-10 object-cover shrink-0" />
      ) : (
        <div className="flex justify-center items-center bg-white/5 border border-white/10 rounded-lg w-14 h-10 shrink-0">
          <Calendar size={14} className="text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{a.event_name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {dateStr && <span className="text-gray-500 text-xs">{dateStr} · {timeStr}</span>}
          {a.place_name && (
            <span className="flex items-center gap-1 text-gray-600 text-xs truncate">
              <MapPin size={11} /> {a.place_name}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {a.event_role && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${EVENT_ROLE_COLOR[a.event_role] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
            {EVENT_ROLE_LABEL[a.event_role] ?? a.event_role}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full border hidden sm:inline ${LIFECYCLE_BADGE[lifecycle]}`}>
          {LIFECYCLE_LABEL[lifecycle]}
        </span>
      </div>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab({ groups, loading, error }: {
  groups: OrgGroup[]; loading: boolean; error: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "ended">("all");
  const allEvents = groups.flatMap((g) => g.events);
  const counts = {
    live:     allEvents.filter((a) => eventLifecycle(a.start_date, a.end_date, a.event_status) === "live").length,
    upcoming: allEvents.filter((a) => eventLifecycle(a.start_date, a.end_date, a.event_status) === "upcoming").length,
    ended:    allEvents.filter((a) => eventLifecycle(a.start_date, a.end_date, a.event_status) === "ended").length,
  };
  const filtered = filter === "all"
    ? allEvents
    : allEvents.filter((a) => eventLifecycle(a.start_date, a.end_date, a.event_status) === filter);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="text-violet-400 animate-spin" /></div>;
  if (error)   return <div className="bg-red-500/10 px-5 py-4 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>;
  if (groups.length === 0) return (
    <div className="space-y-3 py-20 text-center">
      <Users size={48} className="mx-auto text-gray-700" />
      <p className="font-medium text-gray-400">ยังไม่ได้เป็น Staff ของงานใด</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="gap-3 grid grid-cols-3">
        {(["live", "upcoming", "ended"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)}
            className={`mt-surface rounded-2xl p-4 text-center transition-colors hover:border-violet-500/30 ${filter === s ? "border border-violet-500/40 bg-violet-500/5" : ""}`}>
            <p className={`text-2xl font-bold ${s === "live" ? "text-green-400" : s === "upcoming" ? "text-blue-400" : "text-gray-500"}`}>
              {counts[s]}
            </p>
            <p className="mt-0.5 text-gray-500 text-xs">{s === "live" ? "Live" : s === "upcoming" ? "Upcoming" : "Ended"}</p>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-white/[0.03] p-1 border border-white/5 rounded-xl">
        {(["all", "live", "upcoming", "ended"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {f === "all" ? `ทั้งหมด (${allEvents.length})` : f === "live" ? "🟢 Live" : f === "upcoming" ? "🔵 Upcoming" : "⚪ Ended"}
          </button>
        ))}
      </div>

      {/* List */}
      {filter === "all" ? (
        groups.map((g) => {
          const logoSrc = g.organizer_logo
            ? (g.organizer_logo.startsWith("http") ? g.organizer_logo : `${API_BASE}${g.organizer_logo}`)
            : null;
          return (
            <div key={g.organizer_id} className="space-y-3">
              <div className="flex items-center gap-3">
                {logoSrc ? (
                  <img src={logoSrc} alt={g.organizer_name} className="border border-white/10 rounded-lg w-8 h-8 object-cover shrink-0" />
                ) : (
                  <div className="flex justify-center items-center bg-white/10 rounded-lg w-8 h-8 shrink-0">
                    <Building2 size={14} className="text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white text-sm">{g.organizer_name}</p>
                  <p className="text-gray-500 text-xs">{STAFF_ROLE_LABEL[g.staff_role] ?? g.staff_role}</p>
                </div>
              </div>
              {g.events.length === 0 ? (
                <p className="pl-11 text-gray-700 text-sm">ยังไม่ได้ถูก assign เข้างานใด</p>
              ) : (
                <div className="space-y-2">{g.events.map((a) => <EventCard key={a.event_id} a={a} />)}</div>
              )}
            </div>
          );
        })
      ) : (
        <div className="space-y-2">
          {filtered.length === 0
            ? <p className="py-8 text-gray-500 text-sm text-center">ไม่มีงานในหมวดนี้</p>
            : filtered.map((a) => <EventCard key={`${a.organizer_id}-${a.event_id}`} a={a} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyStaffPage() {
  const [groups, setGroups]   = useState<OrgGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("authToken");
    if (!token) { setLoading(false); return; }
    fetchMyStaffAssignments(token)
      .then((data) => setGroups(groupByOrganizer(data)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-black min-h-screen overflow-y-auto text-white">
      <div className="space-y-6 mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-violet-400" />
          <div>
            <h1 className="font-bold text-white text-2xl">Staff Dashboard</h1>
            <p className="text-gray-500 text-sm">งานที่คุณได้รับมอบหมาย</p>
          </div>
        </div>
        <EventsTab groups={groups} loading={loading} error={error} />
      </div>
    </div>
  );
}
