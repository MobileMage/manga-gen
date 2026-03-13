const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const url = `${BACKEND_URL}${path}`;
  console.log(`[api] ${method} ${url}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error("[api] Network error:", err);
    throw new ApiError(0, "Cannot reach backend — is it running?");
  }

  console.log(`[api] Response: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => message);
    }
    console.error(`[api] Error: ${message}`);
    throw new ApiError(res.status, message);
  }

  const data = await res.json();
  console.log("[api] Success:", typeof data === "object" ? Object.keys(data) : data);
  return data as T;
}
