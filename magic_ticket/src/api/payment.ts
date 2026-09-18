import { apiFetch } from "./client";

// ============================================================
// Types
// ============================================================

export interface CheckoutRequest {
  event_id: number;
  zone_id: number;
  seat_ids: number[];
  payment_method_id?: number;
}

interface CheckoutResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;

  // Stripe Connected Account
  stripe_account_id: string;

  // Platform fee
  platform_fee?: number;
  platform_fee_percent?: number;

  ticket_ids?: number[];
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

  status:
    | "pending"
    | "paid"
    | "failed";

  amount: number;

  ticket_count: number;
}

export interface MyTicket {
  id: number;

  qrcode: string;

  status:
    | "reserved"
    | "paid"
    | "checked_in"
    | "cancelled";

  created_at: string;

  seat_position: string | null;

  zone_name: string;

  zone_type: string;

  zone_price: number;

  event_name: string;

  event_start: string;

  place_name: string;

  qr_data_url: string | null;
}

// ============================================================
// Checkout
// ============================================================

export async function checkout(
  token: string,
  body: CheckoutRequest,
): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>(
    "/payment/checkout",
    {
      method: "POST",

      token,

      body: JSON.stringify(body),
    },
  );
}

// ============================================================
// Confirm Payment
// ============================================================

export async function confirmPayment(
  token: string,
  intentId: string,
): Promise<ConfirmResponse> {
  return apiFetch<ConfirmResponse>(
    "/payment/confirm",
    {
      method: "POST",

      token,

      body: JSON.stringify({
        payment_intent_id: intentId,
      }),
    },
  );
}

// ============================================================
// Get Session
// ============================================================

export async function getPaymentSession(
  token: string,
  sessionId: string,
): Promise<SessionStatus> {
  return apiFetch<SessionStatus>(
    `/payment/session/${sessionId}`,
    {
      token,
    },
  );
}

// ============================================================
// My Tickets
// ============================================================

export async function getMyTickets(
  token: string,
): Promise<MyTicket[]> {
  const data =
    await apiFetch<{
      tickets: MyTicket[];
    }>(
      "/payment/my-tickets",
      {
        token,
      },
    );

  return data.tickets ?? [];
}