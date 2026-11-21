const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
let accessToken = null;
let refreshRequest = null;

export function setAccessToken(token) {
  accessToken = token;
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        accessToken = result.accessToken;
        return result;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const execute = () => fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  let response = await execute();

  if (response.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${accessToken}`);
      response = await execute();
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.details = body.details;
    throw error;
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.blob();
}

export const api = {
  get: (path) => request(path),
  post: (path, body, extraHeaders = {}) => request(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: extraHeaders
  }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" })
};

export async function download(path, filename) {
  const blob = await request(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
