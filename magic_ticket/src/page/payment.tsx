import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft, ShieldCheck, Loader2, XCircle,
  CheckCircle2, Ticket, Download,
} from "lucide-react";
import Cookies from "js-cookie";
import { checkout, confirmPayment, type TicketResult } from "@/api/payment";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentState {
  eventId: number;
  eventName: string;
  zone: { id: number; name: string; type: string; price: number };
  seats: { id: number; position: string; name: string }[];
  totalPrice: number;
}

// ─── Stripe form ──────────────────────────────────────────────────────────────
function StripeCardForm({
  totalPrice, paymentIntentId, paymentContext,
}: {
  totalPrice: number;
  paymentIntentId: string;
  paymentContext: PaymentState | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErrorMessage(null);

    // บันทึก context ไว้ก่อน redirect เพื่อให้ return page ใช้ต่อได้
    if (paymentContext) {
      sessionStorage.setItem("paymentContext", JSON.stringify(paymentContext));
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/return`,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "การชำระเงินไม่สำเร็จ กรุณาลองใหม่");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-green-400" />
        <span className="text-green-400 text-xs">ระบบชำระเงินปลอดภัยด้วย Stripe</span>
      </div>

      <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 p-3 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="flex justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 shadow-lg shadow-violet-600/30 py-4 rounded-xl w-full font-bold text-white text-base active:scale-[0.98] transition-all disabled:cursor-not-allowed"
      >
        {loading
          ? <><Loader2 size={20} className="animate-spin" /> กำลังประมวลผล...</>
          : `ชำระเงิน ฿${totalPrice.toLocaleString()}`}
      </button>
    </form>
  );
}

// ─── QR Ticket card ───────────────────────────────────────────────────────────
function QRTicketCard({ ticket, eventName, zoneName, seatPosition }: {
  ticket: TicketResult;
  eventName: string;
  zoneName: string;
  seatPosition?: string | null;
}) {
  function download() {
    const a = document.createElement("a");
    a.href = ticket.qr_data_url;
    a.download = `ticket-${ticket.ticket_id}.png`;
    a.click();
  }
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 bg-violet-600/20 px-5 py-3 border-violet-500/20 border-b">
        <Ticket size={18} className="text-violet-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{eventName}</p>
          <p className="text-violet-300 text-xs">
            {zoneName}{(seatPosition ?? ticket.seat_position) ? ` · ที่นั่ง ${seatPosition ?? ticket.seat_position}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 p-5">
        <div className="bg-white p-3 rounded-xl">
          <img src={ticket.qr_data_url} alt="QR" className="w-48 h-48" />
        </div>
        <p className="font-mono text-gray-600 text-xs tracking-wider">{ticket.qrcode}</p>
        <button onClick={download}
          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs transition-colors">
          <Download size={13} /> บันทึก QR Code
        </button>
      </div>
    </div>
  );
}

// ─── Main payment page ────────────────────────────────────────────────────────
export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentState | null;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) { navigate("/", { replace: true }); return; }

    async function init() {
      const token = Cookies.get("authToken");
      if (!token) { navigate("/signin", { state: { from: "/payment" } }); return; }

      try {
        const res = await checkout(token, {
          event_id: state!.eventId,
          zone_id: state!.zone.id,
          seat_ids: state!.seats.map((s) => s.id),
        });
        setClientSecret(res.client_secret);
        setPaymentIntentId(res.payment_intent_id ?? "");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "ไม่สามารถเริ่มการชำระเงินได้");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (!state) return null;

  return (
    <div className="bg-black min-h-screen overflow-y-auto text-white">
      <div className="space-y-6 mx-auto px-4 py-8 max-w-lg">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <ArrowLeft size={18} /> กลับ
        </button>

        <div>
          <h1 className="font-bold text-white text-2xl">ชำระเงิน</h1>
          <p className="mt-0.5 text-gray-500 text-sm">{state.eventName}</p>
        </div>

        {/* Order summary */}
        <div className="space-y-3 bg-white/[0.03] p-5 border border-white/10 rounded-2xl">
          <h2 className="font-semibold text-white text-sm">สรุปรายการ</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">โซน</span>
              <span className="text-white">{state.zone.name} ({state.zone.type})</span>
            </div>
            {state.seats.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-gray-400">ที่นั่ง</span>
                <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
                  {state.seats.map((s) => (
                    <span key={s.id}
                      className="bg-violet-500/20 px-2 py-0.5 border border-violet-500/30 rounded-full text-violet-300 text-xs">
                      {s.position}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {state.seats.length > 1 && (
              <div className="flex justify-between">
                <span className="text-gray-400">จำนวน</span>
                <span className="text-white">{state.seats.length} ที่</span>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-3 border-white/10 border-t">
            <span className="font-semibold text-gray-300">ยอดรวม</span>
            <span className="font-bold text-violet-300 text-xl">
              {state.totalPrice === 0 ? "ฟรี" : `฿${state.totalPrice.toLocaleString()}`}
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col justify-center items-center space-y-3 py-12">
            <Loader2 size={32} className="text-violet-500 animate-spin" />
            <p className="text-gray-400 text-sm">กำลังเชื่อมต่อ Stripe...</p>
          </div>
        )}

        {error && (
          <div className="space-y-2 bg-red-500/10 p-4 border border-red-500/20 rounded-xl text-center">
            <XCircle size={32} className="mx-auto text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <StripeCardForm
              totalPrice={state.totalPrice}
              paymentIntentId={paymentIntentId}
              paymentContext={state}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

// ─── Return page (Stripe redirects here after payment) ───────────────────────
export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<"confirming" | "success" | "failed">("confirming");
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [zoneName, setZoneName] = useState("");

  useEffect(() => {
    // Restore context from sessionStorage (set before Stripe redirect)
    const saved = sessionStorage.getItem("paymentContext");
    if (saved) {
      const ctx = JSON.parse(saved) as PaymentState;
      setEventName(ctx.eventName);
      setZoneName(ctx.zone.name);
    }

    const intentId = searchParams.get("payment_intent")
      ?? searchParams.get("payment_intent_id");
    if (!intentId) { navigate("/", { replace: true }); return; }

    async function confirm() {
      const token = Cookies.get("authToken");
      if (!token) { navigate("/signin"); return; }
      try {
        const res = await confirmPayment(token, intentId!);
        setTickets(res.tickets ?? []);
        setStep("success");
        sessionStorage.removeItem("paymentContext");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "ยืนยันการชำระเงินไม่สำเร็จ");
        setStep("failed");
      }
    }
    confirm();
  }, []);

  if (step === "confirming") {
    return (
      <div className="flex flex-col justify-center items-center gap-4 bg-black min-h-screen text-white">
        <Loader2 size={36} className="text-violet-400 animate-spin" />
        <p className="text-gray-400 text-sm">กำลังยืนยันการชำระเงิน...</p>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="flex flex-col justify-center items-center gap-4 bg-black p-6 min-h-screen text-white">
        <XCircle size={48} className="text-red-400" />
        <p className="font-bold text-white text-xl">การชำระเงินไม่สำเร็จ</p>
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={() => navigate(-1)}
          className="bg-violet-600 hover:bg-violet-700 mt-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm">
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen overflow-y-auto text-white">
      <div className="space-y-6 mx-auto px-4 py-8 max-w-lg">
        <div className="flex flex-col items-center space-y-3 py-6">
          <div className="flex justify-center items-center bg-green-500/20 rounded-full w-16 h-16">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
          <h1 className="font-bold text-white text-2xl">ชำระเงินสำเร็จ!</h1>
        </div>

        <h2 className="font-semibold text-white">บัตรของคุณ ({tickets.length} ใบ)</h2>

        <div className="space-y-4">
          {tickets.map((t) => (
            <QRTicketCard
              key={t.ticket_id}
              ticket={t}
              eventName={eventName}
              zoneName={zoneName}
            />
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center">
          QR Code ใช้สำหรับ check-in ที่หน้างาน — บันทึกรูปไว้ในโทรศัพท์
        </p>

        <div className="flex gap-3">
          <button onClick={() => navigate("/my-tickets")}
            className="flex-1 hover:bg-white/5 py-3 border border-white/10 rounded-xl font-semibold text-white text-sm">
            ดูตั๋วทั้งหมด
          </button>
          <button onClick={() => navigate("/")}
            className="flex-1 bg-violet-600 hover:bg-violet-700 py-3 rounded-xl font-semibold text-white text-sm">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
