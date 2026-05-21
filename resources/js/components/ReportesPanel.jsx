import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import ChartComponent from "./ChartComponent";
import TableComponent from "./TableComponent";

// Mapeo de granularidad a etiquetas en español
const GRANULARITY_LABELS = {
  day: "diarios",
  week: "semanales",
  month: "mensuales",
  year: "anuales",
};

const GRANULARITY_SINGULAR = {
  day: "diario",
  week: "semanal",
  month: "mensual",
  year: "anual",
};

export default function ReportesPanel() {
  const { user } = useAuth();
  const notify = useNotifications();
  const isAdminUser = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [devices, setDevices] = useState([]);
  const [cities, setCities] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    metric: "ph",
    granularity: "week",
    start: "",
    end: "",
    device_id: "",
    city_id: "",
  });
  const [aiFilters, setAiFilters] = useState({
    metric: "ph",
    granularity: "week",
    start: "",
    end: "",
    device_id: "",
    city_id: "",
  });
  const [reportResult, setReportResult] = useState(null);
  const [resultFiltros, setResultFiltros] = useState(reportFilters);
  const [aiResult, setAiResult] = useState(null);
  const [aiResultFiltros, setAiResultFiltros] = useState(aiFilters);
  const [consultaEjecutada, setConsultaEjecutada] = useState(false);
  const [aiEjecutada, setAiEjecutada] = useState(false);
  const greetedNoDevicesRef = useRef(false);
  const lastConsultaFiltrosRef = useRef(null);

  function normalizeDeviceList(deviceList) {
    return Array.isArray(deviceList) ? deviceList : [];
  }

  function normalizeCityList(deviceList) {
    const map = new Map();

    normalizeDeviceList(deviceList).forEach((device) => {
      if (device?.city?.id && !map.has(device.city.id)) {
        map.set(device.city.id, device.city);
      }
    });

    return Array.from(map.values());
  }

  useEffect(() => {
    setLoading(true);

    api.getStats()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message ?? "No se pudieron cargar los reportes."))
      .finally(() => setLoading(false));

    if (isAdminUser) {
      api.getAdminDevices()
        .then((d) => setDevices(Array.isArray(d) ? d : []))
        .catch(() => setDevices([]));

      api.getCities()
        .then((c) => setCities(Array.isArray(c) ? c : []))
        .catch(() => setCities([]));
      return;
    }

    const assignedDevices = normalizeDeviceList(user?.devices);
    setDevices(assignedDevices);
    setCities(normalizeCityList(assignedDevices));
  }, [isAdminUser, user]);

  const hasAssignedDevices = isAdminUser || devices.length > 0;

  useEffect(() => {
    if (!isAdminUser && !hasAssignedDevices && !greetedNoDevicesRef.current) {
      notify.warning("No tienes dispositivos asignados todavía. Contacta al administrador para poder consultar y generar reportes.", { title: "Reportes" });
      greetedNoDevicesRef.current = true;
    }
  }, [hasAssignedDevices, isAdminUser, notify]);

  useEffect(() => {
    function handleAlertsRefresh() {
      if (!consultaEjecutada || !lastConsultaFiltrosRef.current) {
        return;
      }

      ejecutarConsulta(lastConsultaFiltrosRef.current, { silent: true });
    }

    window.addEventListener('aquasense:alerts-refresh', handleAlertsRefresh);

    return () => {
      window.removeEventListener('aquasense:alerts-refresh', handleAlertsRefresh);
    };
  }, [consultaEjecutada]);

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

  // Ejecuta la consulta. Si se pasa `overrideFiltros`, usa esos en lugar del state `filtros`.
  async function ejecutarConsulta(overrideFiltros = null, options = {}) {
    const { silent = false } = options;

    if (!isAdminUser && !hasAssignedDevices) {
      if (!silent) {
        notify.warning("No tienes dispositivos asignados todavía. Contacta al administrador para poder consultar y generar reportes.", { title: "Reportes" });
      }
      setReportResult(null);
      return;
    }

    setActionLoading("consulta");
    setReportResult(null);
    setConsultaEjecutada(false);

    try {
      const used = {
        ...reportFilters,
        ...(overrideFiltros ?? {}),
      };

      // Construir payload omitiendo campos vacíos
      const payload = {
        metric: used.metric || "ph",
        granularity: used.granularity || "week",
      };
      if (used.start) payload.start = used.start;
      if (used.end) payload.end = used.end;
      if (used.device_id) payload.device_id = parseInt(used.device_id);
      if (used.city_id) payload.city_id = parseInt(used.city_id);

      const response = await api.consultarReportes(payload);

      const hasData = response?.series && response.series.length > 0;
      const resultPayload = response ?? { series: [], rows: [], meta: {} };

      setReportFilters((prev) => ({ ...prev, ...(overrideFiltros ?? {}) }));
      setResultFiltros((prev) => ({ ...prev, ...(overrideFiltros ?? {}) }));
      lastConsultaFiltrosRef.current = { ...used };
      setReportResult(resultPayload);
      setConsultaEjecutada(true);

      if (!hasData) {
        if (!silent) {
          notify.warning(response?.meta?.mensaje ?? "No hay datos disponibles para los filtros seleccionados. Intenta cambiar el rango de fechas, dispositivo o ciudad.", { title: "Reportes" });
        }
      } else {
        const selectedCity = cities.find(c => c.id === parseInt(used.city_id))?.name || "todas";
        const selectedDevice = devices.find(d => d.id === parseInt(used.device_id))?.name || "todos";
        const granularityLabel = GRANULARITY_LABELS[used.granularity] || "datos";
        if (!silent) {
          notify.success(`Consulta completada: ${response.series.length} puntos de ${granularityLabel} (dispositivo: ${selectedDevice}, ciudad: ${selectedCity})`, { title: "Reportes" });
        }
      }
    } catch (err) {
      if (!silent) {
        notify.error(err.message ?? "No se pudo consultar el reporte.", { title: "Reportes" });
      }
      setReportResult(null);
      setConsultaEjecutada(false);
    } finally {
      setActionLoading(null);
    }
  }

  // Exportación con filtros opcionales
  async function ejecutarExportacion(formato, overrideFiltros = null) {
    if (!isAdminUser && !hasAssignedDevices) {
      notify.warning("No tienes dispositivos asignados todavía. Contacta al administrador para poder exportar reportes.", { title: "Reportes" });
      return;
    }

    setActionLoading(`export-${formato}`);

    try {
      const used = overrideFiltros ?? reportFilters;
      const payload = {
        metric: used.metric || "ph",
        format: formato,
        granularity: used.granularity || "week",
      };
      if (used.start) payload.start = used.start;
      if (used.end) payload.end = used.end;
      if (used.device_id) payload.device_id = parseInt(used.device_id);
      if (used.city_id) payload.city_id = parseInt(used.city_id);

      const response = await api.exportarReportes(payload);
      const formatLabel = formato === "xlsx" ? "Excel" : "Word";
      const id = response?.activity_id;
      
      notify.success(response?.mensaje ?? `Exportación ${formatLabel} generada.${response?.filename ? ` Archivo: ${response.filename}` : ""}`, {
        title: "Reportes",
        actions: id ? [
          {
            label: "Descargar",
            onClick: () => {
              window.location.href = `/api/reportes/export/download/${id}`;
            },
          },
        ] : [],
      });
    } catch (err) {
      notify.error(err.message ?? "No se pudo preparar la exportación.", { title: "Reportes" });
    } finally {
      setActionLoading(null);
    }
  }

  // Resumen IA con filtros opcionales
  async function ejecutarResumenIa(overrideFiltros = null) {
    if (!isAdminUser && !hasAssignedDevices) {
      notify.warning("No tienes dispositivos asignados todavía. Contacta al administrador para poder generar resúmenes IA.", { title: "Reportes" });
      return;
    }

    setActionLoading("ia");

    try {
      const used = overrideFiltros ?? aiFilters;
      const payload = {
        metric: used.metric || "ph",
        granularity: used.granularity || "week",
      };
      if (used.start) payload.start = used.start;
      if (used.end) payload.end = used.end;
      if (used.device_id) payload.device_id = parseInt(used.device_id);
      if (used.city_id) payload.city_id = parseInt(used.city_id);

      const response = await api.resumenIaReportes(payload);
      const summaryText = response?.resumen ?? response?.mensaje ?? `Resumen IA generado. ${response?.resumen?.substring(0, 100) ?? ""}`;
      setAiResult(response ?? { resumen: summaryText, mensaje: summaryText, filtros: used });
      setAiResultFiltros({ ...used });
      setAiEjecutada(true);
      notify.success(summaryText, { title: "Reportes" });
    } catch (err) {
      notify.error(err.message ?? "No se pudo generar el resumen IA.", { title: "Reportes" });
    } finally {
      setActionLoading(null);
    }
  }

  const seriesRows = Array.isArray(reportResult?.series) ? reportResult.series : [];
  const tableRows = Array.isArray(reportResult?.rows) ? reportResult.rows : [];

  return (
    <section className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-file-earmark-bar-graph"></i>
        Reportes
      </div>
      <p className="aq-table-meta" style={{ marginTop: 0 }}>
        Módulo para consulta de reportes, resumen IA y exportación en Word/Excel.
      </p>

      {!isAdminUser && !hasAssignedDevices && (
        <div className="aq-alert-warning" style={{ marginBottom: "1rem" }}>
          <i className="bi bi-exclamation-triangle"></i>
          No tienes dispositivos asignados todavía. Contacta al administrador para poder consultar y generar reportes.
        </div>
      )}

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
          <span className="aq-stat-value">Consulta + IA</span>
          <span className="aq-stat-unit">gráficas, tabla y Word</span>
        </div>
      </div>

      <div className="aq-overview-grid" style={{ marginTop: "1rem" }}>
        <section className="aq-panel" style={{ minHeight: "100%" }}>
          <div className="aq-panel-title">
            <i className="bi bi-funnel"></i>
            Consultas preparadas
          </div>
          <p className="aq-table-meta" style={{ marginTop: 0 }}>
            Ajusta los filtros de periodo, métrica, dispositivo y ciudad para consultar reportes.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginTop: "0.85rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Métrica
              </label>
              <select
                className="aq-input"
                value={reportFilters.metric}
                onChange={(e) => setReportFilters({ ...reportFilters, metric: e.target.value })}
              >
                <option value="ph">pH</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Granularidad
              </label>
              <select
                className="aq-input"
                value={reportFilters.granularity}
                onChange={(e) => setReportFilters({ ...reportFilters, granularity: e.target.value })}
              >
                <option value="day">Diario</option>
                <option value="week">Semanal</option>
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Desde (fecha)
              </label>
              <input
                type="date"
                className="aq-input"
                value={reportFilters.start}
                onChange={(e) => setReportFilters({ ...reportFilters, start: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Hasta (fecha)
              </label>
              <input
                type="date"
                className="aq-input"
                value={reportFilters.end}
                onChange={(e) => setReportFilters({ ...reportFilters, end: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Dispositivo
              </label>
              <select
                className="aq-input"
                value={reportFilters.device_id}
                onChange={(e) => setReportFilters({ ...reportFilters, device_id: e.target.value })}
                disabled={!hasAssignedDevices}
              >
                <option value="">{isAdminUser ? "Todos" : hasAssignedDevices ? "Todos mis dispositivos" : "Sin dispositivos"}</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.identifier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Ciudad
              </label>
              <select
                className="aq-input"
                value={reportFilters.city_id}
                onChange={(e) => setReportFilters({ ...reportFilters, city_id: e.target.value })}
                disabled={!hasAssignedDevices}
              >
                <option value="">{isAdminUser ? "Todas" : hasAssignedDevices ? "Mis ciudades" : "Sin ciudades"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="aq-btn-secondary"
            style={{ marginTop: "0.85rem" }}
            onClick={ejecutarConsulta}
            disabled={actionLoading !== null || (!isAdminUser && !hasAssignedDevices)}
          >
            {actionLoading === "consulta" ? "Consultando..." : "Ejecutar consulta"}
          </button>
        </section>

        <section className="aq-panel" style={{ minHeight: "100%" }}>
          <div className="aq-panel-title">
            <i className="bi bi-stars"></i>
            Resumen con IA
          </div>
          <p className="aq-table-meta" style={{ marginTop: 0 }}>
            Elige los mismos filtros o ajusta otros distintos para resumir con Gemini la operación que quieras revisar.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginTop: "0.85rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Métrica
              </label>
              <select
                className="aq-input"
                value={aiFilters.metric}
                onChange={(e) => setAiFilters({ ...aiFilters, metric: e.target.value })}
              >
                <option value="ph">pH</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Granularidad
              </label>
              <select
                className="aq-input"
                value={aiFilters.granularity}
                onChange={(e) => setAiFilters({ ...aiFilters, granularity: e.target.value })}
              >
                <option value="day">Diario</option>
                <option value="week">Semanal</option>
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Desde (fecha)
              </label>
              <input
                type="date"
                className="aq-input"
                value={aiFilters.start}
                onChange={(e) => setAiFilters({ ...aiFilters, start: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Hasta (fecha)
              </label>
              <input
                type="date"
                className="aq-input"
                value={aiFilters.end}
                onChange={(e) => setAiFilters({ ...aiFilters, end: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Dispositivo
              </label>
              <select
                className="aq-input"
                value={aiFilters.device_id}
                onChange={(e) => setAiFilters({ ...aiFilters, device_id: e.target.value })}
                disabled={!hasAssignedDevices}
              >
                <option value="">{isAdminUser ? "Todos" : hasAssignedDevices ? "Todos mis dispositivos" : "Sin dispositivos"}</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.identifier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Ciudad
              </label>
              <select
                className="aq-input"
                value={aiFilters.city_id}
                onChange={(e) => setAiFilters({ ...aiFilters, city_id: e.target.value })}
                disabled={!hasAssignedDevices}
              >
                <option value="">{isAdminUser ? "Todas" : hasAssignedDevices ? "Mis ciudades" : "Sin ciudades"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="aq-btn-primary"
            style={{ marginTop: "0.85rem" }}
            onClick={() => ejecutarResumenIa(aiFilters)}
            disabled={actionLoading !== null || (!isAdminUser && !hasAssignedDevices)}
          >
            {actionLoading === "ia" ? "Generando resumen..." : "Generar resumen IA"}
          </button>

          <button
            type="button"
            className="aq-btn-secondary"
            style={{ marginTop: "0.65rem" }}
            onClick={() => ejecutarExportacion("docx", aiFilters)}
            disabled={actionLoading !== null || (!isAdminUser && !hasAssignedDevices)}
          >
            {actionLoading === "export-docx" ? "Preparando Word..." : "Exportar IA a Word"}
          </button>

          {aiEjecutada && aiResult && (
            <div className="aq-report-summary-card" style={{ marginTop: "1rem" }}>
              <div className="aq-report-summary-head">
                <div>
                  <strong>Resumen IA</strong>
                  <div className="aq-table-meta">
                    Filtros: {aiResultFiltros.granularity || "week"} · Ciudad {cities.find((city) => String(city.id) === String(aiResultFiltros.city_id))?.name ?? "Todas"} · Dispositivo {devices.find((device) => String(device.id) === String(aiResultFiltros.device_id))?.name ?? "Todos"}
                  </div>
                </div>
                <span className="aq-badge aq-severity-media">IA</span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: "0.75rem" }}>
                {aiResult.resumen ?? aiResult.mensaje ?? "Sin resumen disponible."}
              </div>
            </div>
          )}
        </section>


      </div>

      {consultaEjecutada && (
        <div style={{ marginTop: "1rem" }}>
          <section className="aq-panel">
            <div className="aq-panel-title">
              <i className="bi bi-bar-chart-fill"></i>
              Resultados de la consulta
            </div>
            <div style={{ marginTop: "0.6rem" }}>
              {(!reportResult?.series || reportResult.series.length === 0) && (
                <div className="aq-empty-state" style={{ marginBottom: "1rem" }}>
                  {reportResult?.meta?.mensaje ?? "No hay datos para el filtro seleccionado. Puedes ajustar los selectores y volver a consultar sin recargar la página."}
                </div>
              )}

              {/* ChartComponent and TableComponent accept external `data` prop if provided */}
              <div style={{ marginBottom: "1rem" }}>
                <ChartComponent
                  data={seriesRows.map((s, idx) => ({ 
                    fecha: s.label, 
                    ph: s.value,
                    index: idx
                  }))}
                  title={`Gráfica — ${reportFilters.metric.toUpperCase()} ${GRANULARITY_SINGULAR[reportFilters.granularity] || ""}`}
                  resultFiltros={resultFiltros}
                  setResultFiltros={setResultFiltros}
                  onRunQuery={ejecutarConsulta}
                  onExport={ejecutarExportacion}
                  onIa={ejecutarResumenIa}
                  devices={devices}
                  />
              </div>

              <div>
                <TableComponent
                    data={tableRows.map((r, idx) => ({
                      id: idx,
                      label: r.label,
                      avg: r.avg,
                      min: r.min,
                      max: r.max,
                      count: r.count,
                      // Anomaly fields added by backend
                      is_anomaly: r.is_anomaly ?? false,
                      anomaly_score: r.anomaly_score ?? null,
                      anomaly_reason: r.anomaly_reason ?? null,
                      dataType: reportResult.meta?.dataType || "aggregated" // Usar indicador de tipo de la API
                    })) ?? []}
                  title={`Tabla — ${reportFilters.metric.toUpperCase()} por período`}
                  resultFiltros={resultFiltros}
                  setResultFiltros={setResultFiltros}
                  onRunQuery={ejecutarConsulta}
                  onExport={ejecutarExportacion}
                  onIa={ejecutarResumenIa}
                  devices={devices}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
