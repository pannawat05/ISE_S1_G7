import { apiFetch } from "./client";

export interface UserProfile {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

export const fetchUser = async (token: string | undefined): Promise<UserProfile | null> => {
  if (!token) return null;

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }

  const user = await apiFetch<UserProfile>("/users/me", { token });
  if (!user) return null;
  localStorage.setItem("user", JSON.stringify(user));
  return user;
};

export const updateProfile = async (
  token: string,
  fields: { firstname?: string; lastname?: string; email?: string },
): Promise<UserProfile> => {
  const updated = await apiFetch<UserProfile>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(fields),
  });
  localStorage.setItem("user", JSON.stringify(updated));
  // Notify NavbarActions (and any other listener) that user data changed
  window.dispatchEvent(new Event("user-updated"));
  return updated;
};
