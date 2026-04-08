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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [savingId, setSavingId] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pushPermission, setPushPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const notifiedAlertsRef = useRef(new Set());

  async function loadAlerts({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.getAlerts({ status: statusFilter, limit: 30 });
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

    if (permission !== "granted" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidPublicKey = window.__VAPID_PUBLIC_KEY_;
        if (!vapidPublicKey) {
          throw new Error("VAPID_PUBLIC_KEY no configurada");
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await api.subscribeToPush({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
      });
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
  }, [statusFilter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadAlerts({ silent: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [statusFilter]);

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
        {pushPermission !== "granted" && pushPermission !== "unsupported" && (
          <button type="button" className="aq-link-button" onClick={enableBrowserPush}>
            Activar
          </button>
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
