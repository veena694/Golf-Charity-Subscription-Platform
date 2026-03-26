const API = (import.meta.env.VITE_API_URL || "https://golf-charity-subscription-platform-bj2n.onrender.com").replace(/\/$/, "");

function toApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.error || payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(toApiUrl(url));
  return parseResponse<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(toApiUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse<T>(response);
}
