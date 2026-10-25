import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ticket, Loader2, RefreshCw, Search } from "lucide-react";
import Cookies from "js-cookie";
import { getMyTickets, confirmPayment, type MyTicket } from "@/api/payment";
import { TicketListHeader } from "@/components/my-tickets";
import RealTicketCard from "@/components/my-tickets/RealTicketCard";

type TabType = "active" | "history";

export default function MyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const [searchParams, setSearchParams] = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  async function load() {
    const token = Cookies.get("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (paymentIntentId && redirectStatus === "succeeded") {
        await confirmPayment(token, paymentIntentId);
        setSearchParams({}, { replace: true });
      }

      const data = await getMyTickets(token);
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดตั๋วไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-black w-full h-full overflow-y-auto font-sans text-white">
      <div className="space-y-6 mx-auto px-6 py-10 max-w-4xl">
        <div className="flex justify-between items-center">
          <TicketListHeader />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 disabled:opacity-50 text-gray-500 hover:text-white text-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            รีเฟรช
          </button>
        </div>

        {loading && (
          <div className="flex flex-col justify-center items-center space-y-3 py-24">
            <Loader2 size={28} className="text-violet-400 animate-spin" />
            <p className="text-gray-400 text-sm">กำลังอัปเดตและดึงข้อมูลตั๋ว...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex justify-between items-center bg-red-500/10 px-5 py-4 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={load} className="text-red-400 hover:text-red-300 text-xs underline cursor-pointer">
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {!loading && !error && !Cookies.get("authToken") && (
          <div className="space-y-4 py-20 text-center">
            <Ticket size={48} className="mx-auto text-gray-700" />
            <p className="text-gray-400">กรุณาเข้าสู่ระบบเพื่อดูตั๋วของคุณ</p>
            <Link
              to="/signin"
              className="inline-block bg-violet-600 hover:bg-violet-700 px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        )}

        {!loading && !error && Cookies.get("authToken") && tickets.length === 0 && (
          <div className="space-y-3 py-20 text-center">
            <Ticket size={48} className="mx-auto text-gray-700" />
            <p className="font-medium text-gray-400">ยังไม่มีตั๋วที่ชำระเงินแล้ว</p>
            <p className="text-gray-600 text-sm">ซื้อบัตรจากหน้า Event เพื่อรับตั๋วของคุณ</p>
            <Link to="/" className="inline-block mt-2 font-semibold text-violet-700 hover:text-violet-800 text-sm transition-colors">
              ดู Events →
            </Link>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "active"
                    ? "border-violet-500 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                ตั๋วพร้อมใช้
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "history"
                    ? "border-violet-500 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                ประวัติ
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="top-1/2 left-3 absolute text-gray-500 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ event..."
                className="bg-white/5 py-2.5 pr-4 pl-9 border border-white/10 focus:border-violet-500/50 rounded-xl outline-none w-full text-white text-sm transition-colors placeholder-gray-500"
              />
            </div>

            {(() => {
              // Filter by tab
              const tabFiltered = tickets.filter((t) => {
                if (activeTab === "active") {
                  // Active: paid or checked_in, not expired
                  const isValidStatus = t.status === "paid" || t.status === "checked_in";
                  const isNotExpired = !t.event_end || new Date(t.event_end) > new Date();
                  return isValidStatus && isNotExpired;
                } else {
                  // History: cancelled, expired, or checked_in
                  const isCancelled = t.status === "cancelled";
                  const isExpired = t.event_end && new Date(t.event_end) <= new Date();
                  const isUsed = t.status === "checked_in";
                  return isCancelled || isExpired || isUsed;
                }
              });

              // Filter by search
              const filtered = tabFiltered.filter((t) =>
                t.event_name.toLowerCase().includes(search.toLowerCase())
              );

              return (
                <>
                  <p className="text-gray-500 text-sm">
                    {filtered.length} ใบ{search ? ` จาก "${search}"` : ""}
                  </p>
                  {filtered.length === 0 ? (
                    <div className="space-y-2 py-12 text-center">
                      <Ticket size={36} className="mx-auto text-gray-700" />
                      <p className="text-gray-500 text-sm">
                        {search
                          ? `ไม่พบตั๋วที่ตรงกับ "${search}"`
                          : activeTab === "active"
                          ? "ยังไม่มีตั๋วพร้อมใช้"
                          : "ยังไม่มีประวัติการใช้ตั๋ว"
                        }
                      </p>
                    </div>
                  ) : (
                    filtered.map((ticket) => (
                      <RealTicketCard key={ticket.id} ticket={ticket} />
                    ))
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}