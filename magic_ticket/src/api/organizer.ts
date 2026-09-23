import { apiFetch, API_BASE } from "./client";

export interface ApiEvent {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  is_active: boolean | number;
  start_date: string;
  end_date: string;
  type_name?: string;
}

export interface UserOrganizer {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
  role: "owner" | "staff" | "manager";
}

export interface OrganizerDetail {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
  owner_id: number;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Helper: convert relative logo URL to absolute URL
export function getLogoUrl(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http")) return logoUrl;
  return `${API_BASE}${logoUrl}`;
}

export async function fetchOrganizerEvents(token: string): Promise<ApiEvent[]> {
  const data = await apiFetch<{ events: ApiEvent[] }>("/organizer/events", { token });
  return data.events ?? [];
}

export async function fetchMyOrganizers(token: string): Promise<UserOrganizer[]> {
  const data = await apiFetch<{ organizers: UserOrganizer[] }>("/users/my-organizers", { token });
  return (data.organizers ?? []).map((org) => ({
    ...org,
    logo_url: getLogoUrl(org.logo_url),
  }));
}

export async function fetchOrganizer(token: string, id: number): Promise<OrganizerDetail> {
  const org = await apiFetch<OrganizerDetail>(`/organizer/${id}`, { token });
  return {
    ...org,
    logo_url: getLogoUrl(org.logo_url),
  };
}

export async function createOrganizer(
  token: string,
  formData: FormData,
): Promise<{ organizerId: number; name: string; logo_url: string | null }> {
  const result = await apiFetch<{ organizerId: number; name: string; logo_url: string | null }>(
    "/organizer/create",
    {
      method: "POST",
      token,
      body: formData,
    },
  );
  return {
    ...result,
    logo_url: getLogoUrl(result.logo_url),
  };
}

export async function updateOrganizer(
  token: string,
  id: number,
  formData: FormData,
): Promise<{ organizer: OrganizerDetail }> {
  const result = await apiFetch<{ organizer: OrganizerDetail }>(`/organizer/${id}`, {
    method: "PUT",
    token,
    body: formData,
  });
  return {
    organizer: {
      ...result.organizer,
      logo_url: getLogoUrl(result.organizer.logo_url),
    },
  };
}

export async function deleteOrganizer(token: string, id: number): Promise<void> {
  await apiFetch(`/organizer/${id}`, {
    method: "DELETE",
    token,
  });
}

export interface EventImage {
  id: number;
  url: string;
  display_order: number;
}

export interface OrganizerEvent {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  latitude: string;
  longitude: string;
  cover_image: string;
  description: string | null;
  theme: string | null;
  status: "pending" | "approved" | "rejected";
  is_active: boolean | number;
  start_date: string;
  end_date: string;
  type_name: string;
  organizer_id: number;
  images?: EventImage[];
}

export async function fetchOrganizerEventsList(
  token: string,
  organizerId: number,
): Promise<OrganizerEvent[]> {
  const data = await apiFetch<{ events: OrganizerEvent[] }>(
    `/organizer/${organizerId}/events`,
    { token },
  );
  return data.events ?? [];
}

export async function createOrganizerEvent(
  token: string,
  organizerId: number,
  body: FormData | {
    name: string; place_name: string; address?: string;
    latitude: number; longitude: number;
    description?: string; theme?: string; type: string;
    start_date: string; end_date: string; is_active?: boolean;
  },
): Promise<{ eventId: number }> {
  const isFormData = body instanceof FormData;
  return apiFetch(`/organizer/${organizerId}/events`, {
    method: "POST", token,
    body: isFormData ? body : JSON.stringify(body),
  });
}

export async function fetchSingleEvent(
  token: string,
  organizerId: number,
  eventId: number,
): Promise<OrganizerEvent> {
  const data = await apiFetch<{ event: OrganizerEvent }>(
    `/organizer/${organizerId}/events/${eventId}`,
    { token },
  );
  return data.event;
}

export async function updateOrganizerEvent(
  token: string,
  organizerId: number,
  eventId: number,
  body: FormData,
): Promise<{ event: OrganizerEvent }> {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}`, {
    method: "PUT", token, body,
  });
}

// ─── Zone API ─────────────────────────────────────────────────────────────────

export interface ZoneImage {
  id: number;
  url: string;
  name: string;
  display_order: number;
}

export interface Zone {
  id: number;
  name: string;
  category: string;
  type: string;
  price: number;
  event_id: number;
  seat_count: number;
  images: ZoneImage[];
}

export async function fetchZones(
  token: string,
  organizerId: number,
  eventId: number,
): Promise<Zone[]> {
  const data = await apiFetch<{ zones: Zone[] }>(
    `/organizer/${organizerId}/events/${eventId}/zones`,
    { token },
  );
  return data.zones ?? [];
}

export async function createZone(
  token: string,
  organizerId: number,
  eventId: number,
  body: FormData,
): Promise<{ zoneId: number; zones: Zone[] }> {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}/zones`, {
    method: "POST",
    token,
    body,
  });
}

export async function updateZone(
  token: string,
  organizerId: number,
  eventId: number,
  zoneId: number,
  body: FormData,
): Promise<{ zones: Zone[] }> {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}/zones/${zoneId}`, {
    method: "PUT",
    token,
    body,
  });
}

export async function deleteZone(
  token: string,
  organizerId: number,
  eventId: number,
  zoneId: number,
): Promise<{ zones: Zone[] }> {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}/zones/${zoneId}`, {
    method: "DELETE",
    token,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type EventLifecycle = "live" | "upcoming" | "ended" | "pending" | "rejected";

export interface DashboardEvent {
  id: number;
  name: string;
  cover_image: string;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  lifecycle: EventLifecycle;
  is_sold_out: boolean;
  start_date: string;
  end_date: string;
  place_name: string;
  type_name: string;
  total_seats: number;
  sold_tickets: number;
  revenue: number;
  checkins: number;
  sales_pct: number | null;
  checkin_pct: number;
}

export interface DashboardKPI {
  total_events: number;
  live: number;
  upcoming: number;
  ended: number;
  total_seats: number;
  total_sold: number;
  total_revenue: number;
  total_checkins: number;
  attendance_rate: number;
  capacity_rate: number;
}

export interface DashboardData {
  kpi: DashboardKPI;
  events: DashboardEvent[];
}

export async function fetchDashboard(
  token: string,
  organizerId: number,
): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/organizer/${organizerId}/dashboard`, { token });
}

export interface AnalyticsRow {
  ticket_id: number;
  event_id: number;
  event_name: string;
  attendee_name: string;
  email: string;
  zone_name: string;
  ticket_type: string;
  is_whitelisted: number;
  ticket_status: string;
  payment_status: string;
  paid_amount: number;
  checked_in_at: string | null;
}

export interface OrganizerAnalytics {
  kpi: {
    views: number;
    registered: number;
    sold: number;
    paid_amount: number;
    checkins: number;
    no_show: number;
    no_show_rate: number;
    checkin_rate: number;
  };
  rows: AnalyticsRow[];
}

export interface AnalyticsFilters {
  eventId?: number;
  from?: string;
  to?: string;
  ticketType?: string;
  whitelist?: "all" | "whitelisted" | "general";
  zoneId?: number;
  paymentStatus?: string;
  ticketStatus?: string;
}

function analyticsQuery(filters: AnalyticsFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== 0) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchOrganizerAnalytics(
  token: string,
  organizerId: number,
  filters: AnalyticsFilters = {},
): Promise<OrganizerAnalytics> {
  return apiFetch<OrganizerAnalytics>(`/organizer/${organizerId}/analytics${analyticsQuery(filters)}`, { token });
}

export async function exportOrganizerAnalytics(
  token: string,
  organizerId: number,
  filters: AnalyticsFilters = {},
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/organizer/${organizerId}/analytics/export${analyticsQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("ส่งออกข้อมูลไม่สำเร็จ");
  return response.blob();
}

// ─── Whitelist ────────────────────────────────────────────────────────────────

export interface WhitelistEntry {
  id: number;
  users_id: number;
  f_name: string;
  l_name: string;
  email: string;
  note: string | null;
  ticket_id: number | null;
  ticket_qrcode: string | null;
}

export interface UserSearchResult {
  id: number;
  f_name: string;
  l_name: string;
  email: string;
}

export async function searchUsers(
  token: string,
  organizerId: number,
  q: string,
): Promise<UserSearchResult[]> {
  const data = await apiFetch<{ users: UserSearchResult[] }>(
    `/organizer/${organizerId}/search-users?q=${encodeURIComponent(q)}`,
    { token },
  );
  return data.users ?? [];
}

export async function fetchWhitelist(
  token: string,
  organizerId: number,
  eventId: number,
): Promise<WhitelistEntry[]> {
  const data = await apiFetch<{ whitelist: WhitelistEntry[] }>(
    `/organizer/${organizerId}/events/${eventId}/whitelist`,
    { token },
  );
  return data.whitelist ?? [];
}
export async function addToWhitelist(
  token: string,
  organizerId: number,
  eventId: number,
  usersId: number,
  note?: string,
): Promise<{ whitelist: WhitelistEntry[]; ticket?: { ticket_id: number; qrcode: string; qr_data_url: string } }> {
  return apiFetch(
    `/organizer/${organizerId}/events/${eventId}/whitelist`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ users_id: usersId, note }),
    },
  );
}

export async function removeFromWhitelist(
  token: string,
  organizerId: number,
  eventId: number,
  wlId: number,
): Promise<WhitelistEntry[]> {
  const data = await apiFetch<{ whitelist: WhitelistEntry[] }>(
    `/organizer/${organizerId}/events/${eventId}/whitelist/${wlId}`,
    { method: "DELETE", token },
  );
  return data.whitelist ?? [];
}

export interface EventStaffAssignment {
  assignment_id: number;
  staff_id: number;
  user_id: number;
  f_name: string;
  l_name: string;
  email: string;
  staff_role: string;
  event_role: string;
}

export async function fetchEventStaff(token: string, organizerId: number, eventId: number) {
  const data = await apiFetch<{ staff: EventStaffAssignment[] }>(
    `/organizer/${organizerId}/events/${eventId}/staff`, { token },
  );
  return data.staff ?? [];
}

export async function assignEventStaff(
  token: string, organizerId: number, eventId: number, userId: number, role: string,
) {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}/staff`, {
    method: "POST", token, body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function removeEventStaff(token: string, organizerId: number, eventId: number, assignmentId: number) {
  return apiFetch(`/organizer/${organizerId}/events/${eventId}/staff/${assignmentId}`, {
    method: "DELETE", token,
  });
}

// ─── Stripe Connect ──────────────────────────────────────────────────────────

export interface StripeOnboardingResponse {
  onboarding_url: string;
}

export async function generateStripeOnboardingLink(
  token: string,
  organizerId: number,
): Promise<StripeOnboardingResponse> {
  return apiFetch<StripeOnboardingResponse>(
    `/organizer/${organizerId}/stripe/onboard`,
    {
      method: "POST",
      token,
    },
  );
}
