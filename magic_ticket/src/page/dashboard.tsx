import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Menu, CalendarDays, Ticket, BadgeDollarSign, Users,
  TrendingUp, RefreshCw, Eye, Pencil, Loader2,
  Radio, Clock, CheckCircle2, XCircle, Layers,
  BarChart3,
} from "lucide-react";
import Cookies from "js-cookie";
import { fetchDashboard, type DashboardData, type DashboardEvent, type EventLifecycle } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { API_BASE } from "@/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIFECYCLE_CONFIG: Record<EventLifecycle, {
  label: string; dot: string; badge: string;
}> = {
  live:     { label: "Live",     dot: "bg-green-400 animate-pulse", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  upcoming: { label: "Upcoming", dot: "bg-blue-400",                badge: "bg-blue-500/15  text-blue-400  border-blue-500/30"  },
  ended:    { label: "Ended",    dot: "bg-gray-500",                badge: "bg-gray-500/10  text-gray-400  border-gray-500/20"  },
  pending:  { label: "Pending",  dot: "bg-yellow-400",             badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  rejected: { label: "Rejected", dot: "bg-red-500",                badge: "bg-red-500/15   text-red-400   border-red-500/30"   },
};

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${n.toLocaleString()}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent = "violet", trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: "violet" | "green" | "blue" | "orange"; trend?: string;
}) {
  const colors = {
    violet: "bg-violet-500/10 text-violet-400",
    green:  "bg-green-500/10  text-green-400",
    blue:   "bg-blue-500/10   text-blue-400",
    orange: "bg-orange-500/10 text-orange-400",
  };
  return (
    <div className="space-y-3 mt-surface p-5 rounded-2xl">
      <div className="flex justify-between items-center">
        <p className="font-medium text-gray-400 text-sm">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[accent]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="font-bold text-white text-3xl">{value}</p>
      {(sub || trend) && (
        <div className="flex justify-between items-center">
          {sub  && <p className="text-gray-500 text-xs">{sub}</p>}
          {trend && <p className="flex items-center gap-1 text-violet-400 text-xs"><TrendingUp size={12} />{trend}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Event Sub-counts ─────────────────────────────────────────────────────────
function EventCountChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{count}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = "violet" }: { pct: number; color?: "violet" | "green" | "blue" }) {
  const colors = { violet: "bg-violet-500", green: "bg-green-500", blue: "bg-blue-500" };
  return (
    <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colors[color]}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Event Status Badge ───────────────────────────────────────────────────────
function LifecycleBadge({ lifecycle, isSoldOut }: { lifecycle: EventLifecycle; isSoldOut: boolean }) {
  if (isSoldOut && lifecycle !== "ended") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500/15 px-2 py-0.5 border border-red-500/30 rounded-full text-red-400 text-xs">
        <span className="inline-block bg-red-400 rounded-full w-1.5 h-1.5" />
        Sold Out
      </span>
    );
  }
  const cfg = LIFECYCLE_CONFIG[lifecycle];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────
function EventRow({ ev, organizerId }: { ev: DashboardEvent; organizerId: string }) {
  const coverSrc = ev.cover_image
    ? (ev.cover_image.startsWith("http") ? ev.cover_image : `${API_BASE}${ev.cover_image}`)
    : null;

  const start = new Date(ev.start_date);
  const dateStr = start.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  return (
    <tr className="group hover:bg-white/[0.02] border-white/5 border-b transition-colors">
      {/* Event name + cover */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {coverSrc ? (
            <img src={coverSrc} alt={ev.name}
              className="border border-white/10 rounded-lg w-14 h-10 object-cover shrink-0" />
          ) : (
            <div className="flex justify-center items-center bg-white/5 border border-white/10 rounded-lg w-14 h-10 shrink-0">
              <CalendarDays size={14} className="text-gray-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="max-w-[200px] font-medium text-white text-sm truncate">{ev.name}</p>
            <p className="text-gray-500 text-xs">{ev.type_name}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <LifecycleBadge lifecycle={ev.lifecycle} isSoldOut={ev.is_sold_out} />
      </td>

      {/* Date */}
      <td className="hidden lg:table-cell px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
        {dateStr}
        <p className="text-gray-600 text-xs">{timeStr}</p>
      </td>

      {/* Ticket sales */}
      <td className="hidden md:table-cell px-4 py-3">
        <div className="space-y-1.5 min-w-[120px]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">{fmtNum(ev.sold_tickets)} / {ev.total_seats > 0 ? fmtNum(ev.total_seats) : "∞"}</span>
            {ev.sales_pct !== null && (
              <span className="text-violet-400">{ev.sales_pct}%</span>
            )}
          </div>
          {ev.sales_pct !== null && <ProgressBar pct={ev.sales_pct} />}
          {ev.sales_pct === null && (
            <p className="text-gray-600 text-xs">ไม่กำหนดที่นั่ง</p>
          )}
        </div>
      </td>

      {/* Check-in */}
      <td className="hidden lg:table-cell px-4 py-3">
        <div className="space-y-1.5 min-w-[100px]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">{fmtNum(ev.checkins)} / {fmtNum(ev.sold_tickets)}</span>
            <span className="text-green-400">{ev.checkin_pct}%</span>
          </div>
          <ProgressBar pct={ev.checkin_pct} color="green" />
        </div>
      </td>

      {/* Revenue */}
      <td className="hidden md:table-cell px-4 py-3 text-right">
        <p className="font-semibold text-white text-sm">{fmtMoney(ev.revenue)}</p>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex justify-end items-center gap-1">
          <Link to={`/events/${ev.id}`}
            className="hover:bg-white/10 p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
            title="ดูหน้า Event">
            <Eye size={15} />
          </Link>
          <Link to={`/profile/events/${organizerId}/edit/${ev.id}`}
            className="hover:bg-white/10 p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
            title="แก้ไข">
            <Pencil size={15} />
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboards() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useProfileSidebar();
  const organizerId = id ?? "";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | EventLifecycle>("all");
  const [search, setSearch] = useState("");

  async function load() {
    const token = Cookies.get("authToken");
    if (!token || !organizerId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDashboard(token, Number(organizerId));
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [organizerId]);

  const filteredEvents = data?.events.filter((e) => {
    const matchFilter = filter === "all" || e.lifecycle === filter || (filter === "live" && e.is_sold_out && e.lifecycle === "live");
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.place_name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }) ?? [];

  const kpi = data?.kpi;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-white text-xl">Dashboard</h1>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 disabled:opacity-50 text-gray-500 hover:text-white text-sm transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          รีเฟรช
        </button>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 space-y-8 px-4 md:px-6 py-6 min-h-0 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 size={28} className="text-violet-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex justify-between items-center bg-red-500/10 px-5 py-4 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={load} className="text-red-400 hover:text-red-300 text-xs underline">ลองอีกครั้ง</button>
          </div>
        )}

        {!loading && !error && kpi && (
          <>
            {/* ── Section 1: KPI Cards ── */}
            <section className="space-y-4">
              <h2 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">ภาพรวม</h2>

              {/* Row 1: Event counts */}
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Events */}
                <div className="space-y-3 lg:col-span-1 mt-surface p-5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400 text-sm">Events ทั้งหมด</p>
                    <div className="flex justify-center items-center bg-violet-500/10 rounded-xl w-9 h-9 text-violet-400">
                      <CalendarDays size={18} />
                    </div>
                  </div>
                  <p className="font-bold text-white text-3xl">{kpi.total_events}</p>
                  <div className="flex justify-between items-center gap-4 pt-1 border-white/5 border-t">
                    <EventCountChip label="Live"     count={kpi.live}     color="text-green-400" />
                    <EventCountChip label="Upcoming" count={kpi.upcoming} color="text-blue-400" />
                    <EventCountChip label="Ended"    count={kpi.ended}    color="text-gray-500" />
                  </div>
                </div>

                {/* Tickets Sold */}
                <div className="space-y-3 mt-surface p-5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400 text-sm">ตั๋วที่ขายได้</p>
                    <div className="flex justify-center items-center bg-orange-500/10 rounded-xl w-9 h-9 text-orange-400">
                      <Ticket size={18} />
                    </div>
                  </div>
                  <p className="font-bold text-white text-3xl">{fmtNum(kpi.total_sold)}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{fmtNum(kpi.total_sold)} / {kpi.total_seats > 0 ? fmtNum(kpi.total_seats) : "∞"} ใบ</span>
                      {kpi.total_seats > 0 && <span className="text-orange-400">{kpi.capacity_rate}%</span>}
                    </div>
                    {kpi.total_seats > 0 && <ProgressBar pct={kpi.capacity_rate} color="violet" />}
                  </div>
                </div>

                {/* Revenue */}
                <KpiCard
                  icon={BadgeDollarSign}
                  label="รายได้รวม"
                  value={fmtMoney(kpi.total_revenue)}
                  sub={`จาก ${fmtNum(kpi.total_sold)} ตั๋ว`}
                  accent="green"
                />

                {/* Check-ins */}
                <div className="space-y-3 mt-surface p-5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400 text-sm">Check-in จริง</p>
                    <div className="flex justify-center items-center bg-blue-500/10 rounded-xl w-9 h-9 text-blue-400">
                      <Users size={18} />
                    </div>
                  </div>
                  <p className="font-bold text-white text-3xl">{fmtNum(kpi.total_checkins)}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{fmtNum(kpi.total_checkins)} / {fmtNum(kpi.total_sold)} คน</span>
                      <span className="text-blue-400">{kpi.attendance_rate}%</span>
                    </div>
                    <ProgressBar pct={kpi.attendance_rate} color="blue" />
                  </div>
                </div>
              </div>

              {/* Capacity bar */}
              {kpi.total_seats > 0 && (
                <div className="flex items-center gap-4 mt-surface p-4 rounded-2xl">
                  <div className="flex justify-center items-center bg-violet-500/10 rounded-xl w-9 h-9 text-violet-400 shrink-0">
                    <Layers size={18} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-400">ความจุรวมทั้งหมด</span>
                      <span className="text-violet-300">
                        {fmtNum(kpi.total_sold)} / {fmtNum(kpi.total_seats)} ที่นั่ง · {kpi.capacity_rate}%
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-600 to-violet-400 rounded-full h-full transition-all"
                        style={{ width: `${Math.min(kpi.capacity_rate, 100)}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-gray-600 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="inline-block bg-violet-500 rounded-full w-2 h-2" />
                        ขายแล้ว {kpi.capacity_rate}%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block bg-white/10 rounded-full w-2 h-2" />
                        ว่าง {Math.max(0, 100 - kpi.capacity_rate)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Section 2: Event Table ── */}
            <section className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="flex items-center gap-2 font-semibold text-gray-400 text-sm uppercase tracking-wider">
                  <BarChart3 size={16} />
                  รายการ Events ({filteredEvents.length})
                </h2>

                {/* Filter + Search */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหา Event..."
                    className="mt-input py-1.5 w-44 text-sm"
                  />
                  {/* Lifecycle filter tabs */}
                  <div className="flex gap-0.5 bg-white/5 p-0.5 rounded-lg">
                    {(["all", "live", "upcoming", "ended", "pending"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          filter === f
                            ? "bg-violet-600 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {f === "all" ? "ทั้งหมด" :
                         f === "live" ? "🟢 Live" :
                         f === "upcoming" ? "🔵 Upcoming" :
                         f === "ended" ? "⚪ Ended" : "🟡 Pending"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="mt-surface rounded-2xl overflow-hidden">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col justify-center items-center space-y-2 py-16">
                    <CalendarDays size={36} className="text-gray-700" />
                    <p className="text-gray-500 text-sm">ไม่พบ Event</p>
                    <Link to={`/profile/events/${organizerId}`}
                      className="text-violet-400 hover:text-violet-300 text-xs transition-colors">
                      สร้าง Event ใหม่ →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-white/5 border-b text-left">
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs">Event</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs">สถานะ</th>
                          <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500 text-xs">วันงาน</th>
                          <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 text-xs">ยอดขายตั๋ว</th>
                          <th className="hidden lg:table-cell px-4 py-3 font-medium text-gray-500 text-xs">Check-in</th>
                          <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 text-xs text-right">รายได้</th>
                          <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map((ev) => (
                          <EventRow key={ev.id} ev={ev} organizerId={organizerId} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick legend */}
              <div className="flex flex-wrap gap-4 px-1 text-gray-600 text-xs">
                {([
                  { key: "live",     color: "bg-green-400",  label: "Live — กำลังจัด" },
                  { key: "upcoming", color: "bg-blue-400",   label: "Upcoming — รอถึงวันงาน" },
                  { key: "ended",    color: "bg-gray-500",   label: "Ended — จบแล้ว" },
                  { key: "pending",  color: "bg-yellow-400", label: "Pending — รออนุมัติ" },
                  { key: "rejected", color: "bg-red-500",    label: "Rejected" },
                ] as const).map((item) => (
                  <span key={item.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
