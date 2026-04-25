import {
  clearSyncedOutboxItems,
  getOutboxReadyItems,
  markOutboxItemError,
  markOutboxItemSynced,
  markOutboxItemSyncing,
  resetOutboxErrorsToPending,
} from "./outbox";

let syncInProgress = false;
let syncIntervalId = null;
let onlineHandler = null;

let csrfReady = false;
let csrfLastFailedAt = 0;
const CSRF_RETRY_COOLDOWN_MS = 5000;

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function buildOfflineError(message = "Sin conexión a internet") {
  const err = new Error(message);
  err.status = 0;
  err.offline = true;
  return err;
}

async function ensureCsrf(baseUrl) {
  if (csrfReady) return;
  if (isOffline()) {
    throw buildOfflineError();
  }

  const now = Date.now();
  if (csrfLastFailedAt > 0 && now - csrfLastFailedAt < CSRF_RETRY_COOLDOWN_MS) {
    throw buildOfflineError("Reintentando conexión...");
  }

  let res;
  try {
    res = await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    csrfLastFailedAt = Date.now();
    throw buildOfflineError();
  }

  if (!res.ok) {
    csrfLastFailedAt = Date.now();
    throw new Error(`No se pudo obtener CSRF cookie (${res.status})`);
  }

  csrfReady = true;
  csrfLastFailedAt = 0;
}

function getXsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function buildBackoffMs(retries) {
  return Math.min(60000, 1000 * Math.pow(2, Math.max(0, retries)));
}

function isRetriableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function replayOutboxItem(item, baseUrl) {
  await ensureCsrf(baseUrl);

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-XSRF-TOKEN": getXsrfToken(),
  };

  const res = await fetch(`${baseUrl}/api${item.path}`, {
    method: item.method,
    headers,
    credentials: "include",
    body: item.body == null ? undefined : JSON.stringify(item.body),
  });

  if (res.status === 204) {
    return;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.message ??
      data?.errors?.[Object.keys(data?.errors ?? {})[0]]?.[0] ??
      `Error ${res.status}`;

    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
}

export async function syncOutboxOnce({ baseUrl }) {
  if (syncInProgress) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncInProgress = true;

  try {
    const batch = getOutboxReadyItems(20);

    for (const item of batch) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        break;
      }

      markOutboxItemSyncing(item.id);

      try {
        await replayOutboxItem(item, baseUrl);
        markOutboxItemSynced(item.id);
      } catch (err) {
        const retries = (item.retries ?? 0) + 1;
        const retriable = err?.status == null || isRetriableStatus(err.status);

        if (retriable) {
          const waitMs = buildBackoffMs(retries);
          const nextRetryAt = new Date(Date.now() + waitMs).toISOString();

          markOutboxItemError(item.id, err.message ?? "Error de sincronización", retries, nextRetryAt);
        } else {
          markOutboxItemError(item.id, err.message ?? "Error de sincronización", retries, null);
        }
      }
    }

    clearSyncedOutboxItems();
  } finally {
    syncInProgress = false;
  }
}

export function startOutboxSync({ baseUrl, intervalMs = 15000 }) {
  if (syncIntervalId) {
    return stopOutboxSync;
  }

  resetOutboxErrorsToPending();

  syncOutboxOnce({ baseUrl }).catch(() => {});

  syncIntervalId = window.setInterval(() => {
    syncOutboxOnce({ baseUrl }).catch(() => {});
  }, intervalMs);

  onlineHandler = () => {
    resetOutboxErrorsToPending();
    syncOutboxOnce({ baseUrl }).catch(() => {});
  };

  window.addEventListener("online", onlineHandler);

  return stopOutboxSync;
}

export function stopOutboxSync() {
  if (syncIntervalId) {
    window.clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
}
