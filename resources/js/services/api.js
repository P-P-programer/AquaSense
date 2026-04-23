/**
 * API client para Laravel + Sanctum SPA
 * - Usa URL relativa por defecto (mismo origen)
 * - Permite override con VITE_API_URL
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

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
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),

  login: (email, password, remember = false) => api.post("/login", { email, password, remember, remember_me: remember }),
  logout: () => api.post("/logout"),
  resendVerificationEmail: (email) => api.post("/email/verification-notification", { email }),
  me: () => api.get("/me"),
  getStats: () => api.get("/stats"),
  getRegistros: (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });

    const suffix = query.toString() ? `?${query.toString()}` : "";

    return api.get(`/registros${suffix}`);
  },
  getAlerts: (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });

    const suffix = query.toString() ? `?${query.toString()}` : "";

    return api.get(`/alerts${suffix}`);
  },
  resolveAlert: (alertId) => api.patch(`/alerts/${alertId}/resolve`),
  getMyAlertPreferences: () => api.get("/me/alert-preferences"),
  updateMyAlertPreferences: (payload) => api.patch("/me/alert-preferences", payload),

  getAdminUsers: () => api.get("/admin/users"),
  createAdminUser: (payload) => api.post("/admin/users", payload),
  updateAdminUser: (userId, payload) => api.patch(`/admin/users/${userId}`, payload),

  getAdminDevices: () => api.get("/admin/devices"),
  createAdminDevice: (payload) => api.post("/admin/devices", payload),
  updateAdminDevice: (deviceId, payload) => api.patch(`/admin/devices/${deviceId}`, payload),
  getAdminDeviceLocations: (deviceId, limit = 100) => api.get(`/admin/devices/${deviceId}/locations?limit=${limit}`),

  getAdminDeviceTokens: (deviceId) => api.get(`/admin/devices/${deviceId}/tokens`),
  createAdminDeviceToken: (deviceId, payload) => api.post(`/admin/devices/${deviceId}/tokens`, payload),
  revokeAdminDeviceToken: (deviceTokenId) => api.patch(`/admin/device-tokens/${deviceTokenId}/revoke`),
  
  // Push Notifications
  subscribeToPush: (payload) => api.post("/push/subscribe", payload),
  unsubscribeFromPush: (payload) => api.post("/push/unsubscribe", payload),
  getPushStatus: () => api.get("/push/status"),

  // Connectivity Settings
  getConnectivitySettings: (deviceId) => api.get(`/admin/devices/${deviceId}/connectivity-settings`),
  updateConnectivitySettings: (deviceId, payload) => api.patch(`/admin/devices/${deviceId}/connectivity-settings`, payload),

  // Cities and Zones
  getCities: (params = {}) => {
    const query = new URLSearchParams();
    if (params.department) query.set("department", params.department);
    if (params.country) query.set("country", params.country);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return api.get(`/cities${suffix}`);
  },

  geocodeSearch: async (query) => {
    const q = String(query ?? "").trim();
    if (!q) return [];

    const res = await fetch(`${NOMINATIM_BASE}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`No se pudo buscar ubicación (${res.status})`);
    }

    const data = await res.json();

    return Array.isArray(data)
      ? data.map((item) => ({
          name: item.display_name,
          latitude: Number(item.lat),
          longitude: Number(item.lon),
        }))
      : [];
  },
};

export default api;
