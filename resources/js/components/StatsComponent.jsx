import { useEffect, useState } from "react";
import api from "../services/api";

export default function StatsComponent() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(err => setError(err.message));
  }, []);

  if (error) return (
    <div className="aq-alert-error">
      <i className="bi bi-exclamation-triangle"></i> Error cargando estadísticas: {error}
    </div>
  );

  if (!stats) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando sensores...
    </div>
  );

  return (
    <>
      {!stats.has_registros && (
        <div className="aq-empty-state" style={{ marginBottom: "0.9rem" }}>
          Aún no hay telemetría en producción. Conecta un dispositivo y espera la primera lectura.
        </div>
      )}

      {stats.last_captured_at && (
        <div className="aq-table-meta" style={{ marginBottom: "0.6rem" }}>
          Última actualización de sensores: {new Date(stats.last_captured_at).toLocaleString()}
        </div>
      )}

      <div className="aq-stats-grid">
      {/* pH — solo si el backend lo envía */}
      {stats.ph_actual != null && (
        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-activity"></i> pH actual</span>
          <span className="aq-stat-value">{stats.ph_actual}</span>
          <span className="aq-stat-unit">escala 0–14</span>
          <span className="aq-stat-indicator ok">
            <i className="bi bi-check-circle-fill"></i> Nivel óptimo
          </span>
        </div>
      )}

      {/* Turbidez — solo si el backend lo envía */}
      {stats.turbidez != null && (
        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-water"></i> Turbidez</span>
          <span className="aq-stat-value">{stats.turbidez}</span>
          <span className="aq-stat-unit">NTU</span>
          <span className="aq-stat-indicator ok">
            <i className="bi bi-check-circle-fill"></i> Dentro del rango
          </span>
        </div>
      )}

      {/* Temperatura — solo si el backend lo envía */}
      {stats.temperatura != null && (
        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-thermometer-half"></i> Temperatura</span>
          <span className="aq-stat-value">{stats.temperatura}</span>
          <span className="aq-stat-unit">°C</span>
          <span className="aq-stat-indicator ok">
            <i className="bi bi-check-circle-fill"></i> Normal
          </span>
        </div>
      )}

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-bell"></i> Alertas activas</span>
        <span className="aq-stat-value" style={{ color: stats.alertas > 0 ? "var(--alerta-warn)" : "var(--alerta-ok)" }}>
          {stats.alertas ?? 0}
        </span>
        <span className="aq-stat-unit">pendientes de revisión</span>
        <span className={`aq-stat-indicator ${stats.alertas > 0 ? "warn" : "ok"}`}>
          <i className={`bi bi-${stats.alertas > 0 ? "exclamation-triangle-fill" : "check-circle-fill"}`}></i>
          {stats.alertas > 0 ? "Requiere atención" : "Sin alertas"}
        </span>
      </div>

      </div>
    </>
  );
}
