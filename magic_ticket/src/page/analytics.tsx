import { useEffect, useState } from "react";
import { BarChart3, Download, Loader2, RefreshCw, Users, Ticket, CreditCard, UserCheck, UserX, Eye } from "lucide-react";
import Cookies from "js-cookie";
import {
  exportOrganizerAnalytics, fetchDashboard, fetchOrganizerAnalytics, fetchZones,
  type AnalyticsFilters, type DashboardData, type OrganizerAnalytics, type Zone,
} from "@/api/organizer";
import { useProfileSidebar } from "@/components/layout/ProfileLayout";

const money = (value: number) => `฿${value.toLocaleString()}`;

function Kpi({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Eye; color: string }) {
  return <div className="mt-surface space-y-3 p-5 rounded-2xl">
    <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">{label}</span><Icon size={18} className={color} /></div>
    <strong className="block font-bold text-white text-2xl">{value}</strong>
  </div>;
}

export default function AnalyticsPage() {
  const { setIsOpen } = useProfileSidebar();
  const organizerId = Number(location.pathname.split("/").pop());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [data, setData] = useState<OrganizerAnalytics | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({ whitelist: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = Cookies.get("authToken") ?? "";
  const selectedEvent = filters.eventId;

  async function loadReport(nextFilters = filters) {
    if (!token || !organizerId) return;
    setLoading(true); setError(null);
    try { setData(await fetchOrganizerAnalytics(token, organizerId, nextFilters)); }
    catch (err) { setError(err instanceof Error ? err.message : "โหลดรายงานไม่สำเร็จ"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token || !organizerId) return;
    fetchDashboard(token, organizerId).then(setDashboard).catch((err) => setError(err.message));
    loadReport();
  }, [organizerId]);

  useEffect(() => {
    if (!selectedEvent || !token) { setZones([]); return; }
    fetchZones(token, organizerId, selectedEvent).then(setZones).catch(() => setZones([]));
  }, [selectedEvent, organizerId]);

  function updateFilter(key: keyof AnalyticsFilters, value: string) {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    loadReport(next);
  }

  async function download(type: "registered" | "paid" | "checked_in") {
    const blob = await exportOrganizerAnalytics(token, organizerId, { ...filters, ticketStatus: type === "registered" ? undefined : type === "paid" ? "paid" : "checked_in", paymentStatus: type === "paid" ? "paid" : filters.paymentStatus });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `analytics-${type}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="flex flex-col h-full min-h-0 overflow-hidden">
    <header className="mt-dashboard-header shrink-0">
      <div className="flex items-center gap-3"><button onClick={() => setIsOpen(true)} className="md:hidden text-gray-400"><BarChart3 size={22} /></button><h1 className="font-semibold text-white text-xl">Analytics</h1></div>
      <button onClick={() => loadReport()} disabled={loading} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> รีเฟรช</button>
    </header>
    <main className="flex-1 space-y-6 px-4 md:px-6 py-6 min-h-0 overflow-y-auto">
      {error && <div className="bg-red-500/10 p-4 border border-red-500/20 rounded-xl text-red-300 text-sm">{error}</div>}
      <section className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1"><span className="text-gray-500 text-xs">Event</span><select value={filters.eventId ?? ""} onChange={(e) => updateFilter("eventId", e.target.value)} className="mt-input"><option value="">ทุกอีเวนท์</option>{dashboard?.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">วันที่เริ่มต้น</span><input type="date" value={filters.from ?? ""} onChange={(e) => updateFilter("from", e.target.value)} className="mt-input" /></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">วันที่สิ้นสุด</span><input type="date" value={filters.to ?? ""} onChange={(e) => updateFilter("to", e.target.value)} className="mt-input" /></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">ประเภทบัตร</span><select value={filters.ticketType ?? ""} onChange={(e) => updateFilter("ticketType", e.target.value)} className="mt-input"><option value="">ทุกประเภท</option>{[...new Set(zones.map((zone) => zone.type))].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">กลุ่ม Whitelist</span><select value={filters.whitelist ?? "all"} onChange={(e) => updateFilter("whitelist", e.target.value)} className="mt-input"><option value="all">ทั้งหมด</option><option value="whitelisted">Whitelist</option><option value="general">ทั่วไป</option></select></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">โซนที่นั่ง</span><select value={filters.zoneId ?? ""} onChange={(e) => updateFilter("zoneId", e.target.value)} className="mt-input"><option value="">ทุกโซน</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
        <label className="space-y-1"><span className="text-gray-500 text-xs">สถานะชำระเงิน</span><select value={filters.paymentStatus ?? ""} onChange={(e) => updateFilter("paymentStatus", e.target.value)} className="mt-input"><option value="">ทุกสถานะ</option><option value="paid">ชำระแล้ว</option><option value="pending">รอชำระ</option><option value="failed">ล้มเหลว</option><option value="unpaid">ยังไม่ชำระ</option></select></label>
      </section>
      {loading && !data ? <div className="flex justify-center py-20"><Loader2 className="text-violet-400 animate-spin" /></div> : data && <>
        <section className="gap-4 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Kpi label="เข้าชม" value={data.kpi.views.toLocaleString()} icon={Eye} color="text-cyan-400" /><Kpi label="ลงทะเบียน" value={data.kpi.registered.toLocaleString()} icon={Users} color="text-blue-400" /><Kpi label="ยอดขาย" value={data.kpi.sold.toLocaleString()} icon={Ticket} color="text-orange-400" /><Kpi label="ยอดชำระเงิน" value={money(data.kpi.paid_amount)} icon={CreditCard} color="text-green-400" /><Kpi label="เช็กอิน" value={data.kpi.checkins.toLocaleString()} icon={UserCheck} color="text-violet-400" /><Kpi label="ไม่มา" value={data.kpi.no_show.toLocaleString()} icon={UserX} color="text-red-400" /><Kpi label="อัตราเช็กอิน" value={`${data.kpi.checkin_rate}%`} icon={BarChart3} color="text-pink-400" />
        </section>
        <section className="flex flex-wrap gap-2">
          <button onClick={() => download("registered")} className="flex items-center gap-2 mt-btn-primary px-3 py-2 text-sm"><Download size={15} /> รายชื่อผู้ลงทะเบียน CSV</button>
          <button onClick={() => download("paid")} className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 border border-white/10 rounded-lg text-gray-300 text-sm"><Download size={15} /> ผู้ชำระเงิน CSV</button>
          <button onClick={() => download("checked_in")} className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 border border-white/10 rounded-lg text-gray-300 text-sm"><Download size={15} /> ผู้เช็กอิน CSV</button>
        </section>
        <section className="mt-surface rounded-2xl overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-white/5 border-b text-gray-500 text-left"><th className="px-4 py-3">ผู้เข้าร่วม</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">โซน / ประเภท</th><th className="px-4 py-3">Whitelist</th><th className="px-4 py-3">ชำระเงิน</th><th className="px-4 py-3">สถานะบัตร</th><th className="px-4 py-3">เช็กอิน</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.ticket_id} className="border-white/5 border-b text-gray-300"><td className="px-4 py-3"><p className="text-white">{row.attendee_name}</p><p className="text-gray-500 text-xs">{row.email}</p></td><td className="px-4 py-3">{row.event_name}</td><td className="px-4 py-3">{row.zone_name} <span className="text-gray-500">· {row.ticket_type}</span></td><td className="px-4 py-3">{Number(row.is_whitelisted) ? "Whitelist" : "ทั่วไป"}</td><td className="px-4 py-3">{row.payment_status} {Number(row.paid_amount) > 0 && `· ${money(Number(row.paid_amount))}`}</td><td className="px-4 py-3">{row.ticket_status}</td><td className="px-4 py-3">{row.checked_in_at ? new Date(row.checked_in_at).toLocaleString("th-TH") : "-"}</td></tr>)}</tbody></table>{!data.rows.length && <p className="py-12 text-gray-500 text-center">ไม่พบข้อมูลตามตัวกรอง</p>}</section>
      </>}
    </main>
  </div>;
}