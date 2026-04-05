import { useEffect, useState } from "react";
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

  async function loadAlerts() {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getAlerts({ status: statusFilter, limit: 30 });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
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
