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

// ─── Zone rows ────────────────────────────────────────────────────────────────

export interface RowConfig {
  label: string;
  count: number;
}

export async function fetchZoneRows(
  token: string,
  organizerId: number,
  eventId: number,
  zoneId: number,
): Promise<RowConfig[]> {
  const data = await apiFetch<{ rows: RowConfig[] }>(
    `/organizer/${organizerId}/events/${eventId}/zones/${zoneId}/rows`,
    { token },
  );
  return data.rows ?? [];
}

// ─── Soft delete event ────────────────────────────────────────────────────────
export async function deleteOrganizerEvent(
  token: string,
  organizerId: number,
  eventId: number,
): Promise<void> {
  await apiFetch(`/organizer/${organizerId}/events/${eventId}`, {
    method: "DELETE",
    token,
  });
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export type StaffRole = "general_staff" | "manager";
export type EventStaffRole = "checkin" | "security" | "registration" | "backstage" | "manager";

export interface StaffMember {
  id: number;
  role: StaffRole;
  join_date: string;
  users_id: number;
  f_name: string;
  l_name: string;
  email: string;
}

export interface EventStaffMember {
  event_id: number;
  staff_id: number;
  role: EventStaffRole;
  assigned_at: string;
  users_id: number;
  f_name: string;
  l_name: string;
  email: string;
}

export async function fetchStaff(token: string, organizerId: number): Promise<StaffMember[]> {
  const d = await apiFetch<{ staff: StaffMember[] }>(`/organizer/${organizerId}/staff`, { token });
  return d.staff ?? [];
}

export async function addStaff(
  token: string, organizerId: number,
  usersId: number, role: StaffRole,
): Promise<StaffMember[]> {
  const d = await apiFetch<{ staff: StaffMember[] }>(`/organizer/${organizerId}/staff`, {
    method: "POST", token, body: JSON.stringify({ users_id: usersId, role }),
  });
  return d.staff ?? [];
}

export async function updateStaffRole(
  token: string, organizerId: number, staffId: number, role: StaffRole,
): Promise<void> {
  await apiFetch(`/organizer/${organizerId}/staff/${staffId}`, {
    method: "PATCH", token, body: JSON.stringify({ role }),
  });
}

export async function removeStaff(
  token: string, organizerId: number, staffId: number,
): Promise<StaffMember[]> {
  const d = await apiFetch<{ staff: StaffMember[] }>(`/organizer/${organizerId}/staff/${staffId}`, {
    method: "DELETE", token,
  });
  return d.staff ?? [];
}

export async function fetchEventStaff(
  token: string, organizerId: number, eventId: number,
): Promise<EventStaffMember[]> {
  const d = await apiFetch<{ event_staff: EventStaffMember[] }>(
    `/organizer/${organizerId}/events/${eventId}/staff`, { token },
  );
  return d.event_staff ?? [];
}

export async function assignStaffToEvent(
  token: string, organizerId: number, eventId: number,
  staffId: number, role: EventStaffRole,
): Promise<EventStaffMember[]> {
  const d = await apiFetch<{ event_staff: EventStaffMember[] }>(
    `/organizer/${organizerId}/events/${eventId}/staff`,
    { method: "POST", token, body: JSON.stringify({ staff_id: staffId, role }) },
  );
  return d.event_staff ?? [];
}

export async function removeStaffFromEvent(
  token: string, organizerId: number, eventId: number, staffId: number,
): Promise<EventStaffMember[]> {
  const d = await apiFetch<{ event_staff: EventStaffMember[] }>(
    `/organizer/${organizerId}/events/${eventId}/staff/${staffId}`,
    { method: "DELETE", token },
  );
  return d.event_staff ?? [];
}

// ─── Event Documents ──────────────────────────────────────────────────────────

export interface EventDocument {
  id: number;
  event_id: number;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: number;
  created_at: string;
}

export async function fetchEventDocuments(
  token: string, organizerId: number, eventId: number,
): Promise<EventDocument[]> {
  const d = await apiFetch<{ documents: EventDocument[] }>(
    `/organizer/${organizerId}/events/${eventId}/documents`, { token },
  );
  return d.documents ?? [];
}

export async function uploadEventDocuments(
  token: string, organizerId: number, eventId: number, files: File[],
): Promise<EventDocument[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("documents", f));
  const d = await apiFetch<{ documents: EventDocument[] }>(
    `/organizer/${organizerId}/events/${eventId}/documents`,
    { method: "POST", token, body: fd },
  );
  return d.documents ?? [];
}

export async function deleteEventDocument(
  token: string, organizerId: number, eventId: number, docId: number,
): Promise<EventDocument[]> {
  const d = await apiFetch<{ documents: EventDocument[] }>(
    `/organizer/${organizerId}/events/${eventId}/documents/${docId}`,
    { method: "DELETE", token },
  );
  return d.documents ?? [];
}
