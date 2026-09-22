import { useState, useEffect } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  loadStripe,
  type Stripe,
} from "@stripe/stripe-js";

import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";

import {
  ArrowLeft,
  ShieldCheck,
  Loader2,
  XCircle,
  CheckCircle2,
  Ticket,
  Download,
} from "lucide-react";

import Cookies from "js-cookie";

import {
  checkout,
  confirmPayment,
  type TicketResult,
} from "@/api/payment";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentState {
  eventId: number;
  eventName: string;

  zone: {
    id: number;
    name: string;
    type: string;
    price: number;
  };

  seats: {
    id: number;
    position: string;
    name: string;
  }[];

  totalPrice: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe form
// ─────────────────────────────────────────────────────────────────────────────

function StripeCardForm({
  totalPrice,
  paymentContext,
}: {
  totalPrice: number;
  paymentContext: PaymentState | null;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage(
        "Stripe ยังไม่พร้อมใช้งาน กรุณารอสักครู่"
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // เก็บข้อมูลไว้ก่อน redirect
    if (paymentContext) {
      sessionStorage.setItem(
        "paymentContext",
        JSON.stringify(paymentContext)
      );
    }

    const { error } =
      await stripe.confirmPayment({
        elements,

        confirmParams: {
          return_url:
            `${window.location.origin}/payment/return`,
        },
      });

    if (error) {
      setErrorMessage(
        error.message ??
          "การชำระเงินไม่สำเร็จ กรุณาลองใหม่"
      );

      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 pb-12"
    >
      {/* Stripe security */}
      <div className="flex items-center gap-2">
        <ShieldCheck
          size={16}
          className="text-green-400"
        />

        <span className="text-green-400 text-xs">
          ระบบชำระเงินปลอดภัยด้วย Stripe
        </span>
      </div>

      {/* Payment Element */}
      <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
        <PaymentElement />
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-red-500/10 p-3 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          !stripe ||
          !elements ||
          loading
        }
        className="flex justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 shadow-lg shadow-violet-600/30 py-4 rounded-xl w-full font-bold text-white text-base active:scale-[0.98] transition-all disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2
              size={20}
              className="animate-spin"
            />

            กำลังประมวลผล...
          </>
        ) : totalPrice === 0 ? (
          "ยืนยันการจอง"
        ) : (
          `ชำระเงิน ฿${totalPrice.toLocaleString()}`
        )}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Ticket Card
// ─────────────────────────────────────────────────────────────────────────────

function QRTicketCard({
  ticket,
  eventName,
  zoneName,
  seatPosition,
}: {
  ticket: TicketResult;
  eventName: string;
  zoneName: string;
  seatPosition?: string | null;
}) {
  function download() {
    const a = document.createElement("a");

    a.href = ticket.qr_data_url;

    a.download =
      `ticket-${ticket.ticket_id}.png`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
  }

  const position =
    seatPosition ??
    ticket.seat_position;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 bg-violet-600/20 px-5 py-3 border-violet-500/20 border-b">

        <Ticket
          size={18}
          className="text-violet-400 shrink-0"
        />

        <div className="min-w-0">

          <p className="font-bold text-white text-sm truncate">
            {eventName}
          </p>

          <p className="text-violet-300 text-xs">
            {zoneName}

            {position
              ? ` · ที่นั่ง ${position}`
              : ""}
          </p>

        </div>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center gap-3 p-5">

        <div className="bg-white p-3 rounded-xl">

          <img
            src={ticket.qr_data_url}
            alt="QR Code"
            className="w-48 h-48"
          />

        </div>

        <p className="font-mono text-gray-600 text-xs tracking-wider">
          {ticket.qrcode}
        </p>

        <button
          type="button"
          onClick={download}
          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs transition-colors"
        >
          <Download size={13} />

          บันทึก QR Code
        </button>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Payment Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentPage() {

  const location = useLocation();
  const navigate = useNavigate();

  const state =
    location.state as PaymentState | null;

  const [
    clientSecret,
    setClientSecret,
  ] = useState<string | null>(null);

  const [
    paymentIntentId,
    setPaymentIntentId,
  ] = useState<string>("");

  const [
    stripeAccountId,
    setStripeAccountId,
  ] = useState<string | null>(null);

  const [
    stripeInstance,
    setStripeInstance,
  ] = useState<Stripe | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Initialize checkout
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {

    if (!state) {
      navigate("/", {
        replace: true,
      });

      return;
    }

    async function init() {

      const token =
        Cookies.get("authToken");

      if (!token) {
        navigate("/signin", {
          state: {
            from: "/payment",
          },
        });

        return;
      }

      try {

        const res =
          await checkout(token, {
            event_id:
              state.eventId,

            zone_id:
              state.zone.id,

            seat_ids:
              state.seats.map(
                (s) => s.id
              ),
          });

        // ─────────────────────────────────────────────────────────────────────
        // Connected Account
        // ─────────────────────────────────────────────────────────────────────

        const connectedAccount =
          res.stripe_account_id;

        if (!connectedAccount) {
          throw new Error(
            "Organizer ยังไม่ได้เชื่อมต่อ Stripe"
          );
        }

        if (
          !connectedAccount.startsWith(
            "acct_"
          )
        ) {
          throw new Error(
            "Stripe Connected Account ID ไม่ถูกต้อง"
          );
        }

        setStripeAccountId(
          connectedAccount
        );

        // ─────────────────────────────────────────────────────────────────────
        // Stripe.js
        // ─────────────────────────────────────────────────────────────────────

        const publishableKey =
          import.meta.env
            .VITE_STRIPE_PUBLISHABLE_KEY;

        if (!publishableKey) {
          throw new Error(
            "ไม่พบ VITE_STRIPE_PUBLISHABLE_KEY"
          );
        }

        const stripe =
          await loadStripe(
            publishableKey,
            {
              stripeAccount:
                connectedAccount,
            },
          );

        if (!stripe) {
          throw new Error(
            "ไม่สามารถโหลด Stripe ได้"
          );
        }

        setStripeInstance(
          stripe
        );

        // ─────────────────────────────────────────────────────────────────────
        // PaymentIntent
        // ─────────────────────────────────────────────────────────────────────

        setClientSecret(
          res.client_secret
        );

        setPaymentIntentId(
          res.payment_intent_id ?? ""
        );

      } catch (
        err: unknown
      ) {

        setError(
          err instanceof Error
            ? err.message
            : "ไม่สามารถเริ่มการชำระเงินได้"
        );

      } finally {

        setLoading(false);

      }
    }

    init();

  }, [navigate, state]);

  if (!state) {
    return null;
  }

  return (
    <div className="bg-black min-h-screen overflow-y-auto text-white">

      <div className="space-y-6 mx-auto px-4 py-8 max-w-lg">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm"
        >
          <ArrowLeft size={18} />

          กลับ
        </button>

        {/* Header */}
        <div>

          <h1 className="font-bold text-white text-2xl">
            ชำระเงิน
          </h1>

          <p className="mt-0.5 text-gray-500 text-sm">
            {state.eventName}
          </p>

        </div>

        {/* Order summary */}
        <div className="space-y-3 bg-white/[0.03] p-5 border border-white/10 rounded-2xl">

          <h2 className="font-semibold text-white text-sm">
            สรุปรายการ
          </h2>

          <div className="space-y-2 text-sm">

            {/* Zone */}
            <div className="flex justify-between gap-4">

              <span className="text-gray-400">
                โซน
              </span>

              <span className="text-white text-right">
                {state.zone.name} (
                {state.zone.type}
                )
              </span>

            </div>

            {/* Seats */}
            {state.seats.length > 0 && (
              <div className="flex justify-between items-start">

                <span className="text-gray-400">
                  ที่นั่ง
                </span>

                <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">

                  {state.seats.map(
                    (s) => (
                      <span
                        key={s.id}
                        className="bg-violet-500/20 px-2 py-0.5 border border-violet-500/30 rounded-full text-violet-300 text-xs"
                      >
                        {s.position}
                      </span>
                    )
                  )}

                </div>
              </div>
            )}

            {/* Quantity */}
            {state.seats.length > 1 && (
              <div className="flex justify-between">

                <span className="text-gray-400">
                  จำนวน
                </span>

                <span className="text-white">
                  {state.seats.length} ที่
                </span>

              </div>
            )}

          </div>

          {/* Total */}
          <div className="flex justify-between pt-3 border-white/10 border-t">

            <span className="font-semibold text-gray-300">
              ยอดรวม
            </span>

            <span className="font-bold text-violet-300 text-xl">

              {state.totalPrice === 0
                ? "ฟรี"
                : `฿${state.totalPrice.toLocaleString()}`}

            </span>

          </div>

        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col justify-center items-center space-y-3 py-12">

            <Loader2
              size={32}
              className="text-violet-500 animate-spin"
            />

            <p className="text-gray-400 text-sm">
              กำลังเชื่อมต่อ Stripe...
            </p>

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="space-y-2 bg-red-500/10 p-4 border border-red-500/20 rounded-xl text-center">

            <XCircle
              size={32}
              className="mx-auto text-red-400"
            />

            <p className="text-red-400 text-sm">
              {error}
            </p>

          </div>
        )}

        {/* Stripe */}
        {!loading &&
          !error &&
          clientSecret &&
          stripeInstance &&
          stripeAccountId && (

            <Elements
              stripe={stripeInstance}
              options={{
                clientSecret,

                appearance: {
                  theme: "stripe",

                  variables: {
                    colorPrimary:
                      "#7c3aed",

                    colorBackground:
                      "#ffffff",

                    colorText:
                      "#172033",

                    colorDanger:
                      "#f87171",

                    borderRadius:
                      "12px",
                  },
                },
              }}
            >

              <StripeCardForm
                totalPrice={
                  state.totalPrice
                }
                paymentContext={
                  state
                }
              />

            </Elements>

          )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Return Page
// ─────────────────────────────────────────────────────────────────────────────

export function PaymentReturnPage() {

  const [
    searchParams,
  ] = useSearchParams();

  const navigate =
    useNavigate();

  const [
    step,
    setStep,
  ] = useState<
    "confirming" |
    "success" |
    "failed"
  >("confirming");

  const [
    tickets,
    setTickets,
  ] = useState<TicketResult[]>(
    []
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    eventName,
    setEventName,
  ] = useState("");

  const [
    zoneName,
    setZoneName,
  ] = useState("");

  // ───────────────────────────────────────────────────────────────────────────
  // Confirm payment
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {

    const saved =
      sessionStorage.getItem(
        "paymentContext"
      );

    if (saved) {

      try {

        const ctx =
          JSON.parse(
            saved
          ) as PaymentState;

        setEventName(
          ctx.eventName
        );

        setZoneName(
          ctx.zone.name
        );

      } catch {
        // ignore
      }
    }

    const intentId =
      searchParams.get(
        "payment_intent"
      ) ??
      searchParams.get(
        "payment_intent_id"
      );

    if (!intentId) {

      navigate("/", {
        replace: true,
      });

      return;
    }

    // สำคัญ: Stripe redirect สำเร็จเท่านั้น
    const redirectStatus =
      searchParams.get(
        "redirect_status"
      );

    if (
      redirectStatus &&
      redirectStatus !== "succeeded"
    ) {

      setError(
        "การชำระเงินไม่สำเร็จ"
      );

      setStep("failed");

      return;
    }

    async function confirm() {

      const token =
        Cookies.get("authToken");

      if (!token) {

        navigate("/signin");

        return;
      }

      try {

        const res =
          await confirmPayment(
            token,
            intentId
          );

        setTickets(
          res.tickets ?? []
        );

        setStep("success");

        sessionStorage.removeItem(
          "paymentContext"
        );

        // เอา query ออกจาก address bar
        // หลังจากอ่าน payment_intent แล้ว
        window.history.replaceState(
          {},
          document.title,
          `${window.location.origin}/payment/return`
        );

      } catch (
        err: unknown
      ) {

        setError(
          err instanceof Error
            ? err.message
            : "ยืนยันการชำระเงินไม่สำเร็จ"
        );

        setStep("failed");

      }
    }

    confirm();

  }, [navigate, searchParams]);

  // ───────────────────────────────────────────────────────────────────────────
  // Confirming
  // ───────────────────────────────────────────────────────────────────────────

  if (step === "confirming") {

    return (
      <div className="flex flex-col justify-center items-center gap-4 bg-black min-h-screen text-white">

        <Loader2
          size={36}
          className="text-violet-400 animate-spin"
        />

        <p className="text-gray-400 text-sm">
          กำลังยืนยันการชำระเงิน...
        </p>

      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Failed
  // ───────────────────────────────────────────────────────────────────────────

  if (step === "failed") {

    return (
      <div className="flex flex-col justify-center items-center gap-4 bg-black p-6 min-h-screen text-white">

        <XCircle
          size={48}
          className="text-red-400"
        />

        <p className="font-bold text-white text-xl">
          การชำระเงินไม่สำเร็จ
        </p>

        <p className="text-red-400 text-sm text-center">
          {error}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-violet-600 hover:bg-violet-700 mt-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
        >
          ลองอีกครั้ง
        </button>

      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Success
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-black min-h-screen overflow-y-auto text-white">

      <div className="space-y-6 mx-auto px-4 py-8 max-w-lg">

        {/* Success header */}
        <div className="flex flex-col items-center space-y-3 py-6">

          <div className="flex justify-center items-center bg-green-500/20 rounded-full w-16 h-16">

            <CheckCircle2
              size={36}
              className="text-green-400"
            />

          </div>

          <h1 className="font-bold text-white text-2xl">
            ชำระเงินสำเร็จ!
          </h1>

        </div>

        {/* Tickets count */}
        <h2 className="font-semibold text-white">
          บัตรของคุณ ({tickets.length} ใบ)
        </h2>

        {/* Tickets */}
        <div className="space-y-4">

          {tickets.map(
            (ticket) => (

              <QRTicketCard
                key={
                  ticket.ticket_id
                }
                ticket={ticket}
                eventName={
                  eventName
                }
                zoneName={
                  zoneName
                }
              />

            )
          )}

        </div>

        {/* Information */}
        <p className="text-gray-600 text-xs text-center">
          QR Code ใช้สำหรับ check-in ที่หน้างาน
          — บันทึกรูปไว้ในโทรศัพท์
        </p>

        {/* Navigation */}
        <div className="flex gap-3">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/my-tickets"
              )
            }
            className="flex-1 hover:bg-white/5 py-3 border border-white/10 rounded-xl font-semibold text-white text-sm"
          >
            ดูตั๋วทั้งหมด
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="flex-1 bg-violet-600 hover:bg-violet-700 py-3 rounded-xl font-semibold text-white text-sm"
          >
            กลับหน้าหลัก
          </button>

        </div>

      </div>
    </div>
  );
}
