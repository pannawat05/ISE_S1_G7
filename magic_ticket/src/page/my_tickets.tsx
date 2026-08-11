import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Ticket, Loader2, RefreshCw } from "lucide-react";
import Cookies from "js-cookie";
import { getMyTickets, type MyTicket } from "@/api/payment";
import { TicketListHeader } from "@/components/my-tickets";
import RealTicketCard from "@/components/my-tickets/RealTicketCard";

export default function MyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = Cookies.get("authToken");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTickets(token);
      // แสดงเฉพาะ paid และ checked_in
      setTickets(data.filter((t) => t.status === "paid" || t.status === "checked_in"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดตั๋วไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-black w-full h-full overflow-y-auto font-sans text-white">
      <div className="space-y-6 mx-auto px-6 py-10 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <TicketListHeader />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 disabled:opacity-50 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            รีเฟรช
          </button>
        </div>

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
            <button onClick={load} className="text-red-400 hover:text-red-300 text-xs underline">
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {/* Not logged in */}
        {!loading && !error && !Cookies.get("authToken") && (
          <div className="space-y-4 py-20 text-center">
            <Ticket size={48} className="mx-auto text-gray-700" />
            <p className="text-gray-400">กรุณาเข้าสู่ระบบเพื่อดูตั๋วของคุณ</p>
            <Link to="/signin" className="inline-block bg-violet-600 hover:bg-violet-700 px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors">
              เข้าสู่ระบบ
            </Link>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && Cookies.get("authToken") && tickets.length === 0 && (
          <div className="space-y-3 py-20 text-center">
            <Ticket size={48} className="mx-auto text-gray-700" />
            <p className="font-medium text-gray-400">ยังไม่มีตั๋วที่ชำระเงินแล้ว</p>
            <p className="text-gray-600 text-sm">ซื้อบัตรจากหน้า Event เพื่อรับตั๋วของคุณ</p>
            <Link to="/" className="inline-block mt-2 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              ดู Events →
            </Link>
          </div>
        )}

        {/* Ticket list */}
        {!loading && !error && tickets.length > 0 && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">{tickets.length} ใบ</p>
            {tickets.map((ticket) => (
              <RealTicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
