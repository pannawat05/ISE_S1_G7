import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Menu, Search, Users, RefreshCw, Loader2, UserPlus } from "lucide-react";
import Cookies from "js-cookie";
import { fetchDashboard, fetchOrganizerAnalytics, type AnalyticsRow, type DashboardData } from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";
import { StaffAssignmentManager } from "@/components/shared";

export default function AttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const { setIsOpen } = useProfileSidebar();
  const organizerId = Number(id);
  const token = Cookies.get("authToken") ?? "";
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStaffMenu, setShowStaffMenu] = useState(false);

  async function load() {
    if (!token || !organizerId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrganizerAnalytics(token, organizerId, {
        eventId: eventId ? Number(eventId) : undefined,
        ticketStatus: status || undefined,
      });
      setRows(result.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายชื่อผู้เข้าร่วมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !organizerId) return;
    fetchDashboard(token, organizerId).then(setDashboard).catch((err) => setError(err.message));
    load();
  }, [organizerId]);

  useEffect(() => { load(); }, [eventId, status]);

  const filteredRows = rows.filter((row) => {
    const term = search.toLowerCase().trim();
    return !term || row.attendee_name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="mt-dashboard-header shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400 hover:text-white"><Menu size={22} /></button>
          <h1 className="font-semibold text-white text-xl">Attendees</h1>
          {!loading && <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-gray-400 text-xs">{filteredRows.length} คน</span>}
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> รีเฟรช</button>
        <button onClick={() => setShowStaffMenu((open) => !open)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-3 py-2 rounded-xl font-semibold text-white text-sm"><UserPlus size={15} /> Assign Staff</button>
      </header>

      <main className="flex-1 space-y-5 px-4 md:px-6 py-6 min-h-0 overflow-y-auto">
        <div className="flex md:flex-row flex-col gap-3">
          <div className="relative flex-1">
            <Search size={16} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล..." className="mt-input pl-9" />
          </div>
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-input md:w-64">
            <option value="">ทุก Event</option>
            {dashboard?.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-input md:w-48">
            <option value="">ทุกสถานะ</option>
            <option value="reserved">Reserved</option>
            <option value="paid">Paid</option>
            <option value="checked_in">Checked-in</option>
          </select>
        </div>

        {showStaffMenu && (eventId ? (
          <StaffAssignmentManager organizerId={organizerId} eventId={Number(eventId)} />
        ) : (
          <div className="bg-violet-500/10 p-4 border border-violet-500/20 rounded-xl text-violet-200 text-sm">
            กรุณาเลือก Event จากตัวกรองด้านบนก่อน เพื่อ assign staff ให้ event นั้น
          </div>
        ))}

        {error && <div className="bg-red-500/10 p-4 border border-red-500/20 rounded-xl text-red-300 text-sm">{error}</div>}
        {loading ? <div className="flex justify-center py-20"><Loader2 className="text-violet-400 animate-spin" /></div> : (
          <section className="mt-surface rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead><tr className="border-white/5 border-b text-gray-500 text-left"><th className="px-4 py-3">ผู้เข้าร่วม</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">โซน</th><th className="px-4 py-3">การชำระเงิน</th><th className="px-4 py-3">สถานะบัตร</th><th className="px-4 py-3">เช็กอิน</th></tr></thead>
              <tbody>{filteredRows.map((row) => <tr key={row.ticket_id} className="hover:bg-white/[0.02] border-white/5 border-b"><td className="px-4 py-3"><p className="text-white">{row.attendee_name}</p><p className="text-gray-500 text-xs">{row.email}</p></td><td className="px-4 py-3 text-gray-300">{row.event_name}</td><td className="px-4 py-3 text-gray-300">{row.zone_name}<span className="text-gray-500"> · {row.ticket_type}</span></td><td className="px-4 py-3 text-gray-300">{row.payment_status}</td><td className="px-4 py-3 text-gray-300">{row.ticket_status}</td><td className="px-4 py-3 text-gray-400">{row.checked_in_at ? new Date(row.checked_in_at).toLocaleString("th-TH") : "-"}</td></tr>)}</tbody>
            </table>
            {!filteredRows.length && <div className="flex flex-col items-center gap-3 py-14 text-center"><Users size={30} className="text-gray-600" /><p className="text-gray-500 text-sm">ไม่พบรายชื่อผู้เข้าร่วม</p></div>}
          </section>
        )}
      </main>
    </div>
  );
}