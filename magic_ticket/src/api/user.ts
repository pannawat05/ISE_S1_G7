import { apiFetch } from "./client";

export interface UserProfile {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;

  // Derived from:
  // organizers.owner_id = users.id
  organizer_id: number | null;

  // Derived permission
  is_organizer: boolean;
  is_staff: boolean;
}

export const fetchUser = async (
  token: string | undefined,
): Promise<UserProfile | null> => {
  if (!token) return null;

  try {
    // Always get latest data from backend.
    // Do not rely on stale localStorage permission data.
    const user = await apiFetch<UserProfile>("/users/me", {
      token,
    });

    if (!user) {
      localStorage.removeItem("user");
      return null;
    }

    localStorage.setItem("user", JSON.stringify(user));

    return user;
  } catch (error) {
    console.error("FETCH USER ERROR:", error);
    return null;
  }
};


// ─── Update profile ─────────────────────────────────────────────────────────

export const updateProfile = async (
  token: string,
  fields: {
    firstname?: string;
    lastname?: string;
    email?: string;
  },
): Promise<UserProfile> => {
  const updated = await apiFetch<UserProfile>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(fields),
  });

  localStorage.setItem("user", JSON.stringify(updated));

  // Tell Navbar and other components that user data changed
  window.dispatchEvent(new Event("user-updated"));

  return updated;
};


// ─── Staff assignments ───────────────────────────────────────────────────────

export interface StaffAssignment {
  staff_id: number;
  staff_role: string;
  organizer_id: number;
  organizer_name: string;
  organizer_logo: string | null;
  event_id: number | null;
  event_name: string | null;
  event_role: string | null;
  event_status: string | null;
  start_date: string | null;
  end_date: string | null;
  place_name: string | null;
  cover_image: string | null;
  assigned_at: string | null;
}

export async function fetchMyStaffAssignments(
  token: string,
): Promise<StaffAssignment[]> {
  const d = await apiFetch<{ assignments: StaffAssignment[] }>(
    "/users/my-staff-assignments",
    { token },
  );

  return d.assignments ?? [];
}


// ─── Check-in scan ───────────────────────────────────────────────────────────

export interface ScanResult {
  status:
    | "ok"
    | "already_checked_in"
    | "wrong_event"
    | "invalid"
    | "cancelled"
    | "not_paid"
    | "invalid_status"
    | "forbidden";

  message: string;
  holder?: string;
  holder_email?: string;
  seat?: string;
  zone?: string;
  ticket_id?: number;
  is_wl?: boolean;
  ticket_event?: string;
}

export async function scanTicket(
  token: string,
  qrcode: string,
  eventId: number,
): Promise<ScanResult> {
  try {
    return await apiFetch<ScanResult>("/checkin/scan", {
      method: "POST",
      token,
      body: JSON.stringify({
        qrcode,
        event_id: eventId,
      }),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        return parsed as ScanResult;
      } catch {
        // ignore
      }

      return {
        status: "invalid",
        message: err.message,
      };
    }

    return {
      status: "invalid",
      message: "เกิดข้อผิดพลาด",
    };
  }
}
