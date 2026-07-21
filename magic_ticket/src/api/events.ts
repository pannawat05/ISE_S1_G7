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
  latitude: string;
  longitude: string;
}

export interface FetchEventsParams {
  search?: string;
  location?: string;
  type?: string;
  limit?: number;
  offset?: number;
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

  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ events: PublicEvent[]; total: number }>(`/events${query}`);
}

export function getCoverUrl(coverImage: string): string | null {
  if (!coverImage) return null;
  if (coverImage.startsWith("http")) return coverImage;
  return `${API_BASE}${coverImage}`;
}
