import { useEffect, useState } from "react";

// Datos de ejemplo mientras el backend no está listo
const MOCK_STATS = {
  total_consumo: 12480,
  promedio_diario: 415,
  alertas: 2,
  ph_actual: 7.2,
  turbidez: 0.8,
  temperatura: 22.4,
};

export default function StatsComponent() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Cuando el backend esté listo, descomenta esto:
    // fetch("/api/stats").then(r => r.json()).then(setStats);

    // Mock temporal:
    setTimeout(() => setStats(MOCK_STATS), 600);
  }, []);

  if (!stats) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando sensores...
    </div>
  );

  return (
    <div className="aq-stats-grid">

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-droplet"></i> Consumo total</span>
        <span className="aq-stat-value">{stats.total_consumo.toLocaleString()}</span>
        <span className="aq-stat-unit">litros este mes</span>
        <div className="aq-stat-bar"><div className="aq-stat-bar-fill" style={{ width: "72%" }}></div></div>
      </div>

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-graph-up"></i> Promedio diario</span>
        <span className="aq-stat-value">{stats.promedio_diario}</span>
        <span className="aq-stat-unit">litros / día</span>
        <div className="aq-stat-bar"><div className="aq-stat-bar-fill" style={{ width: "48%" }}></div></div>
      </div>

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-activity"></i> pH actual</span>
        <span className="aq-stat-value">{stats.ph_actual}</span>
        <span className="aq-stat-unit">escala 0–14</span>
        <span className="aq-stat-indicator ok">
          <i className="bi bi-check-circle-fill"></i> Nivel óptimo
        </span>
      </div>

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-water"></i> Turbidez</span>
        <span className="aq-stat-value">{stats.turbidez}</span>
        <span className="aq-stat-unit">NTU</span>
        <span className="aq-stat-indicator ok">
          <i className="bi bi-check-circle-fill"></i> Dentro del rango
        </span>
      </div>

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-thermometer-half"></i> Temperatura</span>
        <span className="aq-stat-value">{stats.temperatura}</span>
        <span className="aq-stat-unit">°C</span>
        <span className="aq-stat-indicator ok">
          <i className="bi bi-check-circle-fill"></i> Normal
        </span>
      </div>

      <div className="aq-stat-card">
        <span className="aq-stat-label"><i className="bi bi-bell"></i> Alertas activas</span>
        <span className="aq-stat-value" style={{ color: stats.alertas > 0 ? "var(--alerta-warn)" : "var(--alerta-ok)" }}>
          {stats.alertas}
        </span>
        <span className="aq-stat-unit">pendientes de revisión</span>
        <span className={`aq-stat-indicator ${stats.alertas > 0 ? "warn" : "ok"}`}>
          <i className={`bi bi-${stats.alertas > 0 ? "exclamation-triangle-fill" : "check-circle-fill"}`}></i>
          {stats.alertas > 0 ? "Requiere atención" : "Sin alertas"}
        </span>
      </div>

    </div>
  );
}
