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
  body: {
    name: string;
    place_name: string;
    address?: string;
    latitude: number;
    longitude: number;
    description?: string;
    theme?: string;
    type: string;
    start_date: string;
    end_date: string;
    is_active?: boolean;
  },
): Promise<{ eventId: number }> {
  return apiFetch(`/organizer/${organizerId}/events`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}
