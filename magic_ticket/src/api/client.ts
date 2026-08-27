
const API_BASE =
  import.meta.env.BASE_API?.replace(/\/$/, "") || "http://localhost:5001";
=======
const API_BASE =  import.meta.env.VITE_BASE_API?.replace(/\/$/, "") || "https://35.247.179.98:5001";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  token?: string | null;
};

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (response.status === 401) {
    // Clear stale credentials and redirect to login
    import("js-cookie").then(({ default: Cookies }) => {
      Cookies.remove("authToken");
      localStorage.removeItem("user");
      window.location.replace("/signin");
    });
    throw new AuthError("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : (data as { message?: string; error?: string }).message ||
          (data as { error?: string }).error ||
          "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export { API_BASE };
