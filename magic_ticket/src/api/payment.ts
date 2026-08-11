import { apiFetch } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutRequest {
  event_id: number;
  zone_id: number;
  seat_ids: number[];
  payment_method_id?: number;
}

export interface CheckoutResponse {
  session_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  ticket_count: number;
  mock: boolean;
}

export interface TicketResult {
  ticket_id: number;
  qrcode: string;
  qr_data_url: string;
  seat_position: string | null;
}

export interface ConfirmResponse {
  message: string;
  session_id: string;
  status: "paid" | "failed";
  amount: number;
  tickets: TicketResult[];
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

export async function confirmPayment(
  token: string,
  sessionId: string,
  simulateFailure = false,
): Promise<ConfirmResponse> {
  return apiFetch("/payment/confirm", {
    method: "POST",
    token,
    body: JSON.stringify({ session_id: sessionId, simulate_failure: simulateFailure }),
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
