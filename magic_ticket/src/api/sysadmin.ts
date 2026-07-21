import { apiFetch } from "./client";

// ─── Event Types ──────────────────────────────────────────────────────────────
export interface EventType {
  id: number;
  name: string;
}

export async function fetchEventTypes(token: string): Promise<EventType[]> {
  const d = await apiFetch<{ event_types: EventType[] }>("/sysadmin/event-types", { token });
  return d.event_types ?? [];
}

export async function createEventType(token: string, name: string): Promise<EventType> {
  return apiFetch("/sysadmin/event-types", { method: "POST", token, body: JSON.stringify({ name }) });
}

export async function updateEventType(token: string, id: number, name: string): Promise<void> {
  await apiFetch(`/sysadmin/event-types/${id}`, { method: "PUT", token, body: JSON.stringify({ name }) });
}

export async function deleteEventType(token: string, id: number): Promise<void> {
  await apiFetch(`/sysadmin/event-types/${id}`, { method: "DELETE", token });
}

// ─── Payment Methods ──────────────────────────────────────────────────────────
export type PaymentCategory = "credit card" | "prompt pay" | "mobile banking" | "cash";

export interface PaymentMethod {
  id: number;
  category: PaymentCategory;
  channel: string;
  gateway: string | null;
  is_active: number;
}

export interface PaymentMethodInput {
  category: PaymentCategory;
  channel: string;
  gateway?: string;
  is_active?: number;
}

export async function fetchPaymentMethods(token: string): Promise<PaymentMethod[]> {
  const d = await apiFetch<{ payment_methods: PaymentMethod[] }>("/sysadmin/payment-methods", { token });
  return d.payment_methods ?? [];
}

export async function createPaymentMethod(token: string, body: PaymentMethodInput): Promise<PaymentMethod> {
  return apiFetch("/sysadmin/payment-methods", { method: "POST", token, body: JSON.stringify(body) });
}

export async function updatePaymentMethod(token: string, id: number, body: PaymentMethodInput): Promise<void> {
  await apiFetch(`/sysadmin/payment-methods/${id}`, { method: "PUT", token, body: JSON.stringify(body) });
}

export async function togglePaymentMethod(token: string, id: number): Promise<void> {
  await apiFetch(`/sysadmin/payment-methods/${id}/toggle`, { method: "PATCH", token });
}

export async function deletePaymentMethod(token: string, id: number): Promise<void> {
  await apiFetch(`/sysadmin/payment-methods/${id}`, { method: "DELETE", token });
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface SysUser {
  id: number;
  email: string;
  f_name: string;
  l_name: string;
  role: "admin" | "customer";
  created_at: string;
}

export async function fetchUsers(
  token: string,
  params: { search?: string; role?: string } = {},
): Promise<SysUser[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.role)   qs.set("role",   params.role);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  const d = await apiFetch<{ users: SysUser[] }>(`/sysadmin/users${q}`, { token });
  return d.users ?? [];
}

export async function updateUserRole(token: string, userId: number, role: "admin" | "customer"): Promise<void> {
  await apiFetch(`/sysadmin/users/${userId}/role`, { method: "PATCH", token, body: JSON.stringify({ role }) });
}

// ─── Organizers ───────────────────────────────────────────────────────────────
export interface SysOrganizer {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_name: string;
  owner_email: string;
  event_count: number;
  created_at: string;
}

export async function fetchSysOrganizers(
  token: string,
  search = "",
): Promise<SysOrganizer[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const d = await apiFetch<{ organizers: SysOrganizer[] }>(`/sysadmin/organizers${q}`, { token });
  return d.organizers ?? [];
}
