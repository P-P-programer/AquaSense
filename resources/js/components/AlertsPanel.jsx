import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const severityLabel = {
  leve: "Leve",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function AlertsPanel() {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [cityFilter, setCityFilter] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [pushSubscribed, setPushSubscribed] = useState(null);
  const notifiedAlertsRef = useRef(new Set());

  async function registerWebPushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Web Push no es compatible en este navegador.");
    }

    if (!navigator.onLine) {
      throw new Error("Sin conexión a internet. Activa la red para registrar notificaciones push.");
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = window.__VAPID_PUBLIC_KEY_;
      if (!vapidPublicKey) {
        throw new Error("VAPID_PUBLIC_KEY no configurada");
      }

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (err) {
        throw new Error(err?.message || "Registration failed - push service error");
      }
    }

    const subscriptionKeys = subscription?.toJSON?.()?.keys;
    if (!subscription?.endpoint || !subscriptionKeys?.auth || !subscriptionKeys?.p256dh) {
      throw new Error("La suscripción push no contiene endpoint/keys válidas.");
    }

    await api.subscribeToPush({
      endpoint: subscription.endpoint,
      keys: subscriptionKeys,
    });

    setPushSubscribed(true);
  }

  async function loadAlerts({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getAlerts({
        status: statusFilter,
        city_id: cityFilter || undefined,
        limit: 30,
      });
      const nextAlerts = Array.isArray(data) ? data : [];
      setAlerts(nextAlerts);
      setLastUpdatedAt(new Date());
      maybeNotifyBrowser(nextAlerts);
    } catch (err) {
      setError(err.message ?? "No se pudieron cargar las alertas.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  function maybeNotifyBrowser(nextAlerts) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    nextAlerts
      .filter((alert) => alert.status === "active" && alert.severity === "critica")
      .forEach((alert) => {
        if (notifiedAlertsRef.current.has(alert.id)) {
          return;
        }

        notifiedAlertsRef.current.add(alert.id);

        new Notification(`AquaSense · ${alert.title}`, {
          body: `${alert.message} (${alert.device?.name ?? "Dispositivo"})`,
          tag: `alert-${alert.id}`,
        });
      });
  }

  async function enableBrowserPush() {
    if (typeof Notification === "undefined") {
      setPushPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission !== "granted") {
      return;
    }

    try {
      await registerWebPushSubscription();
    } catch (err) {
      setError(err.message ?? "No se pudo activar Web Push.");
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, cityFilter]);

  useEffect(() => {
    api.getCities()
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    api.getPushStatus()
      .then((status) => setPushSubscribed(Boolean(status?.subscribed)))
      .catch(() => setPushSubscribed(false));
  }, []);

  useEffect(() => {
    if (pushPermission !== "granted") {
      return;
    }

    if (pushSubscribed === true) {
      return;
    }

    registerWebPushSubscription().catch(() => {
      // Mantener silencioso: el usuario puede reintentar con el botón.
    });
  }, [pushPermission, pushSubscribed]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadAlerts({ silent: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [statusFilter, cityFilter]);

  async function resolveAlert(alertId) {
    setSavingId(alertId);
    setError(null);

    try {
      await api.resolveAlert(alertId);
      await loadAlerts();
    } catch (err) {
      setError(err.message ?? "No se pudo resolver la alerta.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="aq-panel aq-alerts-panel">
      <div className="aq-alerts-head">
        <div className="aq-panel-title">
          <i className="bi bi-bell-fill"></i>
          Alertas operativas
        </div>
        <div className="aq-alerts-filters">
          <button type="button" className="aq-btn-secondary" onClick={() => loadAlerts()}>
            Refrescar
          </button>
          <select
            className="aq-input"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">Todas las ciudades</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.name} ({city.department})</option>
            ))}
          </select>
          <select
            className="aq-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Activas</option>
            <option value="resolved">Resueltas</option>
          </select>
        </div>
      </div>

      <p className="aq-table-meta" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
        {isAdmin()
          ? "Vista global: alertas de todos los dispositivos."
          : "Vista personal: alertas de tus dispositivos asignados."}
      </p>

      <div className="aq-table-meta" style={{ marginBottom: "0.6rem" }}>
        Última actualización: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "—"}
      </div>

      <div className="aq-table-meta" style={{ marginBottom: "0.9rem" }}>
        Notificaciones del navegador: {pushPermission}
        {pushPermission !== "unsupported" && (
          <>
            <span> · Suscripción push: {pushSubscribed === null ? "verificando..." : pushSubscribed ? "activa" : "inactiva"}</span>
            <button type="button" className="aq-link-button" onClick={enableBrowserPush}>
              {pushPermission === "granted" ? "Reintentar registro" : "Activar"}
            </button>
          </>
        )}
      </div>

      {error && <div className="aq-alert-error"><i className="bi bi-exclamation-triangle"></i> {error}</div>}

      {loading && (
        <div className="aq-loading">
          <div className="aq-spinner"></div>
          Cargando alertas...
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="aq-loading">No hay alertas para este filtro.</div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="aq-admin-token-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="aq-token-item aq-alert-item">
              <div>
                <div className="aq-alert-title-row">
                  <strong>{alert.title}</strong>
                  <span className={`aq-badge aq-severity-${alert.severity}`}>{severityLabel[alert.severity] ?? alert.severity}</span>
                </div>
                <div className="aq-table-meta">{alert.message}</div>
                <div className="aq-table-meta">
                  Dispositivo: {alert.device?.name ?? "—"} ({alert.device?.identifier ?? "—"})
                </div>
                <div className="aq-table-meta">
                  Ciudad: {alert.device?.city?.name ?? "Sin ciudad"}
                </div>
                <div className="aq-table-meta">
                  Tipo: {alert.type} · Último disparo: {formatDate(alert.last_triggered_at)} · Repeticiones: {alert.triggered_count}
                </div>
              </div>

              {alert.status === "active" && (
                <button
                  type="button"
                  className="aq-btn-secondary"
                  disabled={savingId === alert.id}
                  onClick={() => resolveAlert(alert.id)}
                >
                  {savingId === alert.id ? "Resolviendo..." : "Marcar resuelta"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
