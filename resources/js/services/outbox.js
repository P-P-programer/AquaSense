const OUTBOX_STORAGE_KEY = "aquasense.outbox.v1";
const OUTBOX_EVENT_NAME = "aquasense:outbox-updated";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeParse(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadQueue() {
  if (!canUseStorage()) return [];
  return safeParse(window.localStorage.getItem(OUTBOX_STORAGE_KEY) ?? "[]");
}

function saveQueue(queue) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  emitOutboxUpdate();
}

function buildId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function buildSignature(method, path, body) {
  return `${method}|${path}|${JSON.stringify(body ?? null)}`;
}

function emitOutboxUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT_NAME));
}

export function getOutboxSnapshot() {
  const queue = loadQueue();

  const pending = queue.filter((item) => item.status === "pending").length;
  const syncing = queue.filter((item) => item.status === "syncing").length;
  const error = queue.filter((item) => item.status === "error").length;
  const synced = queue.filter((item) => item.status === "synced").length;

  return {
    pending,
    syncing,
    error,
    synced,
    total: queue.length,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
  };
}

export function subscribeOutboxStatus(listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const notify = () => listener(getOutboxSnapshot());

  window.addEventListener(OUTBOX_EVENT_NAME, notify);
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);

  notify();

  return () => {
    window.removeEventListener(OUTBOX_EVENT_NAME, notify);
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

export function enqueueOutboxRequest({ method, path, body }) {
  const queue = loadQueue();
  const signature = buildSignature(method, path, body);

  const existing = queue.find(
    (item) => item.status === "pending" && item.signature === signature,
  );

  if (existing) {
    return existing;
  }

  const item = {
    id: buildId(),
    method,
    path,
    body: body ?? null,
    signature,
    status: "pending",
    retries: 0,
    lastError: null,
    nextRetryAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  queue.push(item);
  saveQueue(queue);

  return item;
}

export function getOutboxReadyItems(limit = 20) {
  const now = Date.now();
  const queue = loadQueue();

  return queue
    .filter((item) => {
      if (item.status === "pending") return true;
      if (item.status !== "error") return false;
      if (!item.nextRetryAt) return false;
      return new Date(item.nextRetryAt).getTime() <= now;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, limit);
}

function patchItem(id, patch) {
  const queue = loadQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index < 0) return null;

  const updated = {
    ...queue[index],
    ...patch,
    updatedAt: nowIso(),
  };

  queue[index] = updated;
  saveQueue(queue);

  return updated;
}

export function markOutboxItemSyncing(id) {
  return patchItem(id, {
    status: "syncing",
    lastError: null,
  });
}

export function markOutboxItemSynced(id) {
  return patchItem(id, {
    status: "synced",
    lastError: null,
    nextRetryAt: null,
  });
}

export function markOutboxItemError(id, errorMessage, retries = 0, nextRetryAt = null) {
  return patchItem(id, {
    status: "error",
    retries,
    lastError: errorMessage,
    nextRetryAt,
  });
}

export function resetOutboxErrorsToPending() {
  const queue = loadQueue();
  let touched = false;

  const updated = queue.map((item) => {
    if (item.status !== "error") return item;

    touched = true;

    return {
      ...item,
      status: "pending",
      nextRetryAt: null,
      updatedAt: nowIso(),
    };
  });

  if (touched) {
    saveQueue(updated);
  }
}

export function clearSyncedOutboxItems() {
  const queue = loadQueue();
  const next = queue.filter((item) => item.status !== "synced");

  if (next.length !== queue.length) {
    saveQueue(next);
  }
}
