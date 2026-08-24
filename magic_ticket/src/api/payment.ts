import { apiFetch } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutRequest {
  event_id: number;
  zone_id: number;
  seat_ids: number[];
  payment_method_id?: number;
}

export interface CheckoutResponse {
  client_secret: string;
  payment_intent_id?: string;
  session_id?: string;
  amount: number;
  currency?: string;
  ticket_count?: number;
  mock?: boolean;
}

export interface TicketResult {
  ticket_id: number;
  qrcode: string;
  qr_data_url: string;
  seat_position: string | null;
}

export interface ConfirmRequest {
  payment_intent_id?: string;
  session_id?: string;
  simulate_failure?: boolean;
}

export interface ConfirmResponse {
  message: string;
  status: "paid" | "failed";
  payment_intent_id?: string;
  session_id?: string;
  amount?: number;
  tickets?: TicketResult[];
}

export interface SessionStatus {
  session_id: string;
  status: "pending" | "paid" | "failed";
  amount: number;
  ticket_count: number;
}

export interface MyTicket {
  id: number;
  qrcode: string;
  status: "reserved" | "paid" | "checked_in" | "cancelled";
  created_at: string;
  seat_position: string;
  zone_name: string;
  zone_type: string;
  zone_price: number;
  event_name: string;
  event_start: string;
  place_name: string;
  qr_data_url: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function checkout(
  token: string,
  body: CheckoutRequest,
): Promise<CheckoutResponse> {
  return apiFetch("/payment/checkout", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

/**
 * รองรับการส่งทั้ง payment_intent_id (Stripe Real) หรือ session_id (Mock/Session)
 */
export async function confirmPayment(
  token: string,
  paymentIntentOrSessionId: string,
  simulateFailure = false,
): Promise<ConfirmResponse> {
  // เช็คว่า id ขึ้นต้นด้วย pi_ (Stripe Intent) หรือไม่
  const isStripeIntent = paymentIntentOrSessionId.startsWith("pi_");

  const body: ConfirmRequest = isStripeIntent
    ? { payment_intent_id: paymentIntentOrSessionId }
    : { session_id: paymentIntentOrSessionId, simulate_failure: simulateFailure };

  return apiFetch("/payment/confirm", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function getPaymentSession(
  token: string,
  sessionId: string,
): Promise<SessionStatus> {
  return apiFetch(`/payment/session/${sessionId}`, { token });
}

export async function getMyTickets(token: string): Promise<MyTicket[]> {
  const data = await apiFetch<{ tickets: MyTicket[] }>("/payment/my-tickets", { token });
  return data.tickets ?? [];
}
