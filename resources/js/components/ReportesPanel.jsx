import { useEffect, useState } from "react";
import api from "../services/api";

export default function ReportesPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [filtrosBase] = useState({
    metric: "ph",
    granularity: "week",
  });

  useEffect(() => {
    api.getStats()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message ?? "No se pudieron cargar los reportes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="aq-panel">
        <div className="aq-loading">
          <div className="aq-spinner"></div>
          Cargando reportes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aq-alert-error">
        <i className="bi bi-exclamation-triangle"></i> Error cargando reportes: {error}
      </div>
    );
  }

  async function ejecutarConsulta() {
    setActionLoading("consulta");
    setActionMessage(null);

    try {
      const response = await api.consultarReportes(filtrosBase);
      setActionMessage(response?.meta?.mensaje ?? "Consulta de reportes lista.");
    } catch (err) {
      setActionMessage(err.message ?? "No se pudo consultar el reporte.");
    } finally {
      setActionLoading(null);
    }
  }

  async function ejecutarExportacion(formato) {
    setActionLoading(`export-${formato}`);
    setActionMessage(null);

    try {
      const response = await api.exportarReportes({
        ...filtrosBase,
        format: formato,
        include_images: true,
      });

      setActionMessage(response?.mensaje ?? `Exportación ${formato.toUpperCase()} preparada.`);
    } catch (err) {
      setActionMessage(err.message ?? "No se pudo preparar la exportación.");
    } finally {
      setActionLoading(null);
    }
  }

  async function ejecutarResumenIa() {
    setActionLoading("ia");
    setActionMessage(null);

    try {
      const response = await api.resumenIaReportes(filtrosBase);
      setActionMessage(response?.mensaje ?? "Resumen con IA preparado.");
    } catch (err) {
      setActionMessage(err.message ?? "No se pudo generar el resumen IA.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-file-earmark-bar-graph"></i>
        Reportes
      </div>
      <p className="aq-table-meta" style={{ marginTop: 0 }}>
        Módulo para resúmenes semanales, filtros por periodo, exportaciones e IA.
      </p>

      <div className="aq-stats-grid">
        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-graph-up"></i> pH semanal</span>
          <span className="aq-stat-value">{stats?.promedio_semanal_ph ?? "—"}</span>
          <span className="aq-stat-unit">promedio últimos 7 días</span>
        </div>

        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-router"></i> Dispositivos activos</span>
          <span className="aq-stat-value">{stats?.dispositivos_activos ?? 0}</span>
          <span className="aq-stat-unit">visibles en el sistema</span>
        </div>

        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-bell"></i> Alertas activas</span>
          <span className="aq-stat-value">{stats?.alertas ?? 0}</span>
          <span className="aq-stat-unit">pendientes de revisión</span>
        </div>

        <div className="aq-stat-card">
          <span className="aq-stat-label"><i className="bi bi-calendar-week"></i> Enfoque</span>
          <span className="aq-stat-value">Sprint 1</span>
          <span className="aq-stat-unit">agregaciones, filtros y vistas</span>
        </div>
      </div>

      <div className="aq-overview-grid" style={{ marginTop: "1rem" }}>
        <section className="aq-panel" style={{ minHeight: "100%" }}>
          <div className="aq-panel-title">
            <i className="bi bi-funnel"></i>
            Consultas preparadas
          </div>
          <p className="aq-table-meta" style={{ marginTop: 0 }}>
            Aquí vivirán los filtros de periodo, métrica y entidad. Esta será la vista para consultar reportes sin salir del módulo.
          </p>
          <div className="aq-table-meta">Posición: arriba del bloque de métricas, alineado con exportaciones e IA.</div>
          <button
            type="button"
            className="aq-btn-secondary"
            style={{ marginTop: "0.85rem" }}
            onClick={ejecutarConsulta}
            disabled={actionLoading !== null}
          >
            {actionLoading === "consulta" ? "Consultando..." : "Probar consulta"}
          </button>
        </section>

        <section className="aq-panel" style={{ minHeight: "100%" }}>
          <div className="aq-panel-title">
            <i className="bi bi-download"></i>
            Exportaciones
          </div>
          <p className="aq-table-meta" style={{ marginTop: 0 }}>
            El botón de exportar quedará aquí para generar Excel o Word con los datos filtrados y las gráficas incluidas.
          </p>
          <div className="aq-table-meta">Posición: a la derecha de las consultas, antes del resumen IA.</div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
            <button
              type="button"
              className="aq-btn-secondary"
              onClick={() => ejecutarExportacion("xlsx")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "export-xlsx" ? "Generando XLSX..." : "Exportar Excel"}
            </button>
            <button
              type="button"
              className="aq-btn-secondary"
              onClick={() => ejecutarExportacion("docx")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "export-docx" ? "Generando Word..." : "Exportar Word"}
            </button>
          </div>
        </section>

        <section className="aq-panel" style={{ minHeight: "100%" }}>
          <div className="aq-panel-title">
            <i className="bi bi-robot"></i>
            Resumen con IA
          </div>
          <p className="aq-table-meta" style={{ marginTop: 0 }}>
            La IA leerá el mismo filtro de consulta y devolverá un resumen textual corto con picos, promedios y hallazgos.
          </p>
          <div className="aq-table-meta">Posición: último bloque visible del módulo, para no mezclarlo con las métricas base.</div>
          <button
            type="button"
            className="aq-btn-secondary"
            style={{ marginTop: "0.85rem" }}
            onClick={ejecutarResumenIa}
            disabled={actionLoading !== null}
          >
            {actionLoading === "ia" ? "Analizando..." : "Generar resumen IA"}
          </button>
        </section>
      </div>

      {actionMessage && (
        <div className="aq-table-meta" style={{ marginTop: "0.9rem" }}>
          {actionLoading ? "Procesando..." : actionMessage}
        </div>
      )}
    </section>
  );
}
