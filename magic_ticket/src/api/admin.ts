import { apiFetch, API_BASE } from "./client";

export interface AdminEvent {
  id: number;
  name: string;
  description: string | null;
  cover_image: string;
  start_date: string;
  end_date: string;
  place_name: string;
  status: "pending" | "approved" | "rejected";
  is_active: number;
  type_name: string;
  organizer_id: number;
  organizer_name: string;
  owner_id: number;
  owner_email: string;
  owner_name: string;
  created_at: string;
}

export interface AdminEventDetail extends AdminEvent {
  address: string | null;
  latitude: string;
  longitude: string;
  theme: string | null;
  images: { id: number; url: string; display_order: number }[];
}

export function getAdminCoverUrl(coverImage: string): string | null {
  if (!coverImage) return null;
  if (coverImage.startsWith("http")) return coverImage;
  return `${API_BASE}${coverImage}`;
}

export async function fetchAdminEvents(
  token: string,
  params: { status?: string; search?: string } = {},
): Promise<AdminEvent[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  const data = await apiFetch<{ events: AdminEvent[] }>(`/admin/events${q}`, { token });
  return data.events ?? [];
}

export async function fetchAdminEventDetail(
  token: string,
  eventId: number,
): Promise<AdminEventDetail> {
  const data = await apiFetch<{ event: AdminEventDetail }>(
    `/admin/events/${eventId}`,
    { token },
  );
  return data.event;
}

export async function approveEvent(token: string, eventId: number): Promise<void> {
  await apiFetch(`/admin/events/${eventId}/approve`, { method: "PATCH", token });
}

export async function rejectEvent(
  token: string,
  eventId: number,
  note: string,
): Promise<void> {
  await apiFetch(`/admin/events/${eventId}/reject`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ note }),
  });
}
