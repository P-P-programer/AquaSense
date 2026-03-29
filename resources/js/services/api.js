/**
 * api.js — Servicio central de comunicación con Laravel + Sanctum SPA
 *
 * Todos los componentes usan este módulo en lugar de fetch() directo.
 * Ventajas:
 *  - El cookie CSRF se obtiene automáticamente antes del primer POST
 *  - Las credenciales (cookies de sesión) se envían siempre
 *  - Los errores de red y de Laravel se normalizan en un solo lugar
 *  - Para cambiar la URL base solo se toca BASE_URL aquí
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── Obtener cookie CSRF de Sanctum ──────────────────────────────────────────
// Solo se llama una vez antes del primer POST. Sanctum establece la cookie
// XSRF-TOKEN que el navegador luego incluye automáticamente como header.
let csrfReady = false;

async function ensureCsrf() {
  if (csrfReady) return;
  await fetch(`${BASE_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
  });
  csrfReady = true;
}

// ─── Leer la cookie XSRF-TOKEN para enviarlo como header ─────────────────────
function getXsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// ─── Wrapper base ─────────────────────────────────────────────────────────────
async function request(method, path, body = null) {
  if (method !== "GET") {
    await ensureCsrf();
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-XSRF-TOKEN": getXsrfToken(),
  };

  const options = {
    method,
    headers,
    credentials: "include", // envía cookies de sesión en cada petición
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}/api${path}`, options);

  // 204 No Content — no tiene body
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Normaliza errores de Laravel (422 validation, 401, 403, 429, 500)
    const message =
      data?.message ??
      data?.errors?.[Object.keys(data?.errors ?? {})[0]]?.[0] ??
      `Error ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return data;
}

// ─── Métodos públicos ─────────────────────────────────────────────────────────
const api = {
  get:    (path)         => request("GET",    path),
  post:   (path, body)   => request("POST",   path, body),
  put:    (path, body)   => request("PUT",    path, body),
  delete: (path)         => request("DELETE", path),

  // ── Auth ──────────────────────────────────────────────────────────────────
  login(email, password) {
    return api.post("/login", { email, password });
  },

  logout() {
    return api.post("/logout");
  },

  me() {
    return api.get("/me");
  },

  // ── Datos del dashboard ───────────────────────────────────────────────────
  getStats() {
    return api.get("/stats");
  },

  getRegistros() {
    return api.get("/registros");
  },
};

export default api;
