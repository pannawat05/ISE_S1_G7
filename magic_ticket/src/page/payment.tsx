/**
 * Payment page — รับ state จาก BookingDrawer แล้วทำ mock Stripe flow
 *
 * State คาดหวัง (via navigate):
 *   eventId, eventName, zone { id, name, type, price },
 *   seats [{ id, position, name }], totalPrice
 */
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CreditCard, CheckCircle2, XCircle, Loader2,
  ArrowLeft, Ticket, ShieldCheck, Download,
} from "lucide-react";
import Cookies from "js-cookie";
import { checkout, confirmPayment, type TicketResult } from "@/api/payment";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentState {
  eventId: number;
  eventName: string;
  zone: { id: number; name: string; type: string; price: number };
  seats: { id: number; position: string; name: string }[];
  totalPrice: number;
}

type PaymentStep = "review" | "processing" | "success" | "failed";

// ─── Mock card form ───────────────────────────────────────────────────────────
function MockCardForm({ onPay, loading }: { onPay: () => void; loading: boolean }) {
  const [card, setCard] = useState({ number: "4242 4242 4242 4242", expiry: "12/28", cvc: "123" });

  function fmt(val: string, type: "number" | "expiry" | "cvc") {
    if (type === "number") return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    if (type === "expiry") {
      const d = val.replace(/\D/g, "").slice(0, 4);
      return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    }
    return val.replace(/\D/g, "").slice(0, 3);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={15} className="text-green-400" />
        <span className="text-green-400 text-xs">Mock Stripe — ไม่มีการเรียกเก็บเงินจริง</span>
      </div>

      {/* Card number */}
      <div className="space-y-1.5">
        <label className="mt-label">หมายเลขบัตร</label>
        <div className="relative">
          <input
            value={card.number}
            onChange={(e) => setCard((p) => ({ ...p, number: fmt(e.target.value, "number") }))}
            placeholder="1234 5678 9012 3456"
            className="mt-input font-mono pr-14"
            maxLength={19}
          />
          <CreditCard size={18} className="top-1/2 right-3 absolute text-gray-500 -translate-y-1/2" />
        </div>
        <p className="text-gray-600 text-xs">ใช้ 4242 4242 4242 4242 เพื่อทดสอบสำเร็จ</p>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="mt-label">วันหมดอายุ</label>
          <input
            value={card.expiry}
            onChange={(e) => setCard((p) => ({ ...p, expiry: fmt(e.target.value, "expiry") }))}
            placeholder="MM/YY" className="mt-input font-mono" maxLength={5}
          />
        </div>
        <div className="space-y-1.5">
          <label className="mt-label">CVC</label>
          <input
            value={card.cvc}
            onChange={(e) => setCard((p) => ({ ...p, cvc: fmt(e.target.value, "cvc") }))}
            placeholder="123" className="mt-input font-mono" maxLength={3}
            type="password"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onPay}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-bold text-white text-base transition-colors mt-2"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> กำลังประมวลผล...</>
          : <><ShieldCheck size={18} /> ยืนยันชำระเงิน</>}
      </button>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket, eventName, zoneName, seatPosition }: {
  ticket: TicketResult; eventName: string; zoneName: string; seatPosition?: string | null;
}) {
  function download() {
    const a = document.createElement("a");
    a.href = ticket.qr_data_url;
    a.download = `ticket-${ticket.ticket_id}-${ticket.qrcode}.png`;
    a.click();
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
      {/* Ticket header */}
      <div className="bg-violet-600/20 border-b border-violet-500/20 px-5 py-4 flex items-center gap-3">
        <Ticket size={20} className="text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{eventName}</p>
          <p className="text-violet-300 text-xs">
            {zoneName}{seatPosition ? ` · ที่นั่ง ${seatPosition}` : ""}
          </p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3 p-6">
        <div className="bg-white p-3 rounded-xl shadow-lg">
          <img src={ticket.qr_data_url} alt="QR Code" className="w-48 h-48" />
        </div>
        <p className="font-mono text-gray-500 text-xs tracking-wider">{ticket.qrcode}</p>
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs transition-colors"
        >
          <Download size={13} /> บันทึก QR Code
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentState | null;

  const [step, setStep] = useState<PaymentStep>("review");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no state
  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, []);

  if (!state) return null;

  const { eventId, eventName, zone, seats, totalPrice } = state;

  // ── Step 1 → Step 2+: checkout then confirm ──
  async function handlePay() {
    const token = Cookies.get("authToken");
    if (!token) { navigate("/signin", { state: { from: "/payment" } }); return; }

    setStep("processing");
    setError(null);

    try {
      // 1. Create session
      const session = await checkout(token, {
        event_id: eventId,
        zone_id:  zone.id,
        seat_ids: seats.map((s) => s.id),
      });
      setSessionId(session.session_id);

      // 2. Simulate small network delay (feels real)
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Confirm
      const result = await confirmPayment(token, session.session_id);
      if (result.status === "paid") {
        setTickets(result.tickets);
        setStep("success");
      } else {
        setError("การชำระเงินไม่สำเร็จ กรุณาลองใหม่");
        setStep("failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setStep("failed");
    }
  }

  return (
    <div className="bg-black min-h-screen text-white overflow-y-auto">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">

        {/* Back */}
        {step === "review" && (
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
            <ArrowLeft size={18} /> กลับ
          </button>
        )}

        {/* ── STEP: review ── */}
        {step === "review" && (
          <>
            <div>
              <h1 className="font-bold text-white text-2xl">ชำระเงิน</h1>
              <p className="text-gray-500 text-sm mt-0.5">{eventName}</p>
            </div>

            {/* Order summary */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-semibold text-white text-sm">สรุปรายการ</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">โซน</span>
                  <span className="text-white">{zone.name} ({zone.type})</span>
                </div>
                {seats.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">ที่นั่ง</span>
                    <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
                      {seats.map((s) => (
                        <span key={s.id} className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs px-2 py-0.5 rounded-full">
                          {s.position}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">ราคา/ที่</span>
                  <span className="text-white">
                    {zone.price === 0 ? "ฟรี" : `฿${zone.price.toLocaleString()}`}
                  </span>
                </div>
                {seats.length > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">จำนวน</span>
                    <span className="text-white">{seats.length} ที่</span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between">
                <span className="font-semibold text-gray-300">ยอดรวม</span>
                <span className="font-bold text-violet-300 text-xl">
                  {totalPrice === 0 ? "ฟรี" : `฿${totalPrice.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Card form */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <h2 className="font-semibold text-white text-sm mb-4">ข้อมูลบัตรเครดิต</h2>
              <MockCardForm onPay={handlePay} loading={false} />
            </div>
          </>
        )}

        {/* ── STEP: processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-24 space-y-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <CreditCard size={28} className="absolute inset-0 m-auto text-violet-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-white text-lg">กำลังประมวลผลการชำระเงิน</p>
              <p className="text-gray-500 text-sm">กรุณาอย่าปิดหน้านี้...</p>
              {sessionId && (
                <p className="font-mono text-gray-700 text-xs mt-2">
                  {sessionId.slice(0, 24)}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: success ── */}
        {step === "success" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-400" />
              </div>
              <div className="text-center">
                <h1 className="font-bold text-white text-2xl">ชำระเงินสำเร็จ!</h1>
                <p className="text-gray-400 text-sm mt-1">
                  {totalPrice === 0 ? "จองสำเร็จ" : `฿${totalPrice.toLocaleString()}`}
                </p>
              </div>
            </div>

            <h2 className="font-semibold text-white text-base">
              บัตรของคุณ ({tickets.length} ใบ)
            </h2>

            <div className="space-y-4">
              {tickets.map((ticket, i) => (
                <TicketCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  eventName={eventName}
                  zoneName={zone.name}
                  seatPosition={seats[i]?.position ?? ticket.seat_position}
                />
              ))}
            </div>

            <p className="text-center text-gray-600 text-xs">
              QR Code จะใช้ check-in ที่งาน — บันทึกรูปไว้ในโทรศัพท์
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/my-tickets")}
                className="flex-1 py-3 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                ดูตั๋วทั้งหมด
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold transition-colors"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: failed ── */}
        {step === "failed" && (
          <div className="flex flex-col items-center py-16 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={36} className="text-red-400" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="font-bold text-white text-xl">การชำระเงินไม่สำเร็จ</h1>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => navigate(-1)}
                className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-400 text-sm hover:text-white">
                กลับ
              </button>
              <button onClick={() => setStep("review")}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold">
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
