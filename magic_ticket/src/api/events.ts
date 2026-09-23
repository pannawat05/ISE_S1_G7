import { apiFetch, API_BASE } from "./client";

export interface PublicEvent {
  id: number;
  name: string;
  place_name: string;
  address: string | null;
  description: string | null;
  cover_image: string;
  start_date: string;
  end_date: string;
  type_name: string;
  organizer_name: string;
  organizer_logo: string | null;
  latitude: string;
  longitude: string;
  theme: string | null;
  images?: { id: number; url: string; display_order: number }[];
}

export interface FetchEventsParams {
  search?: string;
  location?: string;
  type?: string;
  limit?: number;
  offset?: number;
  // 📌 1. เพิ่ม 2 ฟิลด์นี้ใน interface
  sortBy?: string;
  order?: string;
}

export async function fetchPublicEvents(
  params: FetchEventsParams = {},
): Promise<{ events: PublicEvent[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search)   qs.set("search",   params.search);
  if (params.location) qs.set("location", params.location);
  if (params.type)     qs.set("type",     params.type);
  if (params.limit)    qs.set("limit",    String(params.limit));
  if (params.offset)   qs.set("offset",   String(params.offset));

  // 📌 2. แนบ sortBy และ order ส่งไปกับ Query String
  if (params.sortBy)   qs.set("sortBy",   params.sortBy);
  if (params.order)    qs.set("order",    params.order);

  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ events: PublicEvent[]; total: number }>(`/events${query}`);
}

export function getCoverUrl(coverImage: string): string | null {
  if (!coverImage) return null;
  if (coverImage.startsWith("http")) return coverImage;
  return `${API_BASE}${coverImage}`;
}

export async function fetchPublicEventById(id: number): Promise<PublicEvent> {
  const data = await apiFetch<{ event: PublicEvent }>(`/events/${id}`);
  return data.event;
}

// ─── Booking: zones + seats ───────────────────────────────────────────────────
export interface PublicZoneImage {
  id: number;
  url: string;
  name: string;
  display_order: number;
}

export interface PublicZone {
  id: number;
  name: string;
  category: string;
  type: string;
  price: number;
  total_seats: number;
  available_seats: number;
  images: PublicZoneImage[];
}

export interface PublicSeat {
  id: number;
  name: string;
  position: string;
  is_active: boolean;
  is_available: boolean;
}

export async function fetchEventZones(eventId: number): Promise<PublicZone[]> {
  const data = await apiFetch<{ zones: PublicZone[] }>(`/events/${eventId}/zones`);
  return data.zones ?? [];
}

export async function fetchZoneSeats(eventId: number, zoneId: number): Promise<PublicSeat[]> {
  const data = await apiFetch<{ seats: PublicSeat[] }>(`/events/${eventId}/zones/${zoneId}/seats`);
  return data.seats ?? [];
}