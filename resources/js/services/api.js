/**
 * API client para Laravel + Sanctum SPA
 * - Usa URL relativa por defecto (mismo origen)
 * - Permite override con VITE_API_URL
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

let csrfReady = false;

async function ensureCsrf() {
  if (csrfReady) return;

  const res = await fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener CSRF cookie (${res.status})`);
  }

  csrfReady = true;
}

function getXsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request(method, path, body = null) {
  if (method !== "GET") {
    await ensureCsrf();
  }

  const headers = { Accept: "application/json" };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["X-XSRF-TOKEN"] = getXsrfToken();
  }

  const options = {
    method,
    headers,
    credentials: "include",
  };

  if (body != null) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}/api${path}`, options);

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.message ??
      data?.errors?.[Object.keys(data?.errors ?? {})[0]]?.[0] ??
      `Error ${res.status}`;

    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return data;
}

const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),

  login: (email, password) => api.post("/login", { email, password }),
  logout: () => api.post("/logout"),
  me: () => api.get("/me"),
  getStats: () => api.get("/stats"),
  getRegistros: () => api.get("/registros"),
};

export default api;
