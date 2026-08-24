import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, ShieldCheck, Loader2, XCircle } from "lucide-react";
import Cookies from "js-cookie";
import { checkout } from "@/api/payment";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentState {
  eventId: number;
  eventName: string;
  zone: { id: number; name: string; type: string; price: number };
  seats: { id: number; position: string; name: string }[];
  totalPrice: number;
}

function StripeCardForm({ totalPrice }: { totalPrice: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/my-tickets`,
      },
    });

    if (error) {
      setErrorMessage(error.message || "การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-green-400" />
        <span className="text-green-400 text-xs">ระบบชำระเงินปลอดภัยด้วย Stripe SSL</span>
      </div>

      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full cursor-pointer flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-white transition-all text-base shadow-lg shadow-violet-600/30"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>กำลังประมวลผล...</span>
          </>
        ) : (
          `ชำระเงิน ฿${totalPrice.toLocaleString()}`
        )}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentState | null;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
      return;
    }

    async function initCheckout() {
      const token = Cookies.get("authToken");
      if (!token) {
        navigate("/signin", { state: { from: "/payment" } });
        return;
      }

      try {
        const res = await checkout(token, {
          event_id: state.eventId,
          zone_id: state.zone.id,
          seat_ids: state.seats.map((s) => s.id),
        });
        setClientSecret(res.client_secret);
      } catch (err: any) {
        setError(err.message || "ไม่สามารถเริ่มการชำระเงินได้");
      } finally {
        setLoading(false);
      }
    }

    initCheckout();
  }, [state]);

  if (!state) return null;

  return (
    <div className="bg-black min-h-screen text-white overflow-y-auto">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm cursor-pointer"
        >
          <ArrowLeft size={18} /> กลับ
        </button>

        <div>
          <h1 className="font-bold text-white text-2xl">ชำระเงิน</h1>
          <p className="text-gray-500 text-sm mt-0.5">{state.eventName}</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-white text-sm">สรุปรายการ</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">โซน</span>
            <span className="text-white">{state.zone.name}</span>
          </div>
          <div className="pt-3 border-t border-white/10 flex justify-between">
            <span className="font-semibold text-gray-300">ยอดรวม</span>
            <span className="font-bold text-violet-300 text-xl">
              ฿{state.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 size={32} className="animate-spin text-violet-500" />
            <p className="text-gray-400 text-sm">กำลังเชื่อมต่อระบบชำระเงิน Stripe...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center space-y-2">
            <XCircle size={32} className="text-red-400 mx-auto" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "night" },
            }}
          >
            <StripeCardForm totalPrice={state.totalPrice} />
          </Elements>
        )}
      </div>
    </div>
  );
}