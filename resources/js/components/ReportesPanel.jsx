import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
  const isAdminUser = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [exportDownloadUrl, setExportDownloadUrl] = useState("");
  const [devices, setDevices] = useState([]);
  const [cities, setCities] = useState([]);
  const [filtros, setFiltros] = useState({
    metric: "ph",
    granularity: "week",
    start: "",
    end: "",
    device_id: "",
    city_id: "",
  });
  const [reportResult, setReportResult] = useState(null);
  const [resultFiltros, setResultFiltros] = useState(filtros);
  const [activityId, setActivityId] = useState(null);

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
  async function ejecutarConsulta(overrideFiltros = null) {
    if (!isAdminUser && !hasAssignedDevices) {
      setActionMessage("⚠️ No tienes dispositivos asignados todavía. Contacta al administrador para poder consultar y generar reportes.");
      setReportResult(null);
      return;
    }

    setActionLoading("consulta");
    setActionMessage(null);
    setReportResult(null);

    try {
      const used = {
        ...filtros,
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

      if (!hasData) {
        setActionMessage(response?.meta?.mensaje ? `⚠️ ${response.meta.mensaje}` : "⚠️ No hay datos disponibles para los filtros seleccionados. Intenta cambiar el rango de fechas, dispositivo o ciudad.");
        setReportResult(null);
      } else {
        setReportResult(response ?? null);
        const selectedCity = cities.find(c => c.id === parseInt(used.city_id))?.name || "todas";
        const selectedDevice = devices.find(d => d.id === parseInt(used.device_id))?.name || "todos";
        const granularityLabel = GRANULARITY_LABELS[used.granularity] || "datos";
        setActionMessage(`✓ Consulta completada: ${response.series.length} puntos de ${granularityLabel} (dispositivo: ${selectedDevice}, ciudad: ${selectedCity})`);
        // sincronizar los filtros principales con los usados en la consulta
        setFiltros((prev) => ({ ...prev, ...(overrideFiltros ?? {}) }));
      }
    } catch (err) {
      setActionMessage(`❌ Error: ${err.message ?? "No se pudo consultar el reporte."}`);
      setReportResult(null);
    } finally {
      setActionLoading(null);
    }
  }

  // Exportación con filtros opcionales
  async function ejecutarExportacion(formato, overrideFiltros = null) {
    if (!isAdminUser && !hasAssignedDevices) {
      setActionMessage("⚠️ No tienes dispositivos asignados todavía. Contacta al administrador para poder exportar reportes.");
      return;
    }

    setActionLoading(`export-${formato}`);
    setActionMessage(null);
    setExportDownloadUrl("");
    setActivityId(null);

    try {
      const used = overrideFiltros ?? filtros;
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
      
      if (id) {
        setActivityId(id);
        // Construir URL de descarga segura
        const downloadUrl = `/api/reportes/export/download/${id}`;
        setExportDownloadUrl(downloadUrl);
      }
      
      setActionMessage(response?.mensaje ?? `✓ Exportación ${formatLabel} generada.${response?.filename ? ` Archivo: ${response.filename}` : ""}`);
    } catch (err) {
      setActionMessage(`❌ Error en exportación: ${err.message ?? "No se pudo preparar la exportación."}`);
    } finally {
      setActionLoading(null);
    }
  }

  // Resumen IA con filtros opcionales
  async function ejecutarResumenIa(overrideFiltros = null) {
    if (!isAdminUser && !hasAssignedDevices) {
      setActionMessage("⚠️ No tienes dispositivos asignados todavía. Contacta al administrador para poder generar resúmenes IA.");
      return;
    }

    setActionLoading("ia");
    setActionMessage(null);

    try {
      const used = overrideFiltros ?? filtros;
      const payload = {
        metric: used.metric || "ph",
        granularity: used.granularity || "week",
      };
      if (used.start) payload.start = used.start;
      if (used.end) payload.end = used.end;
      if (used.device_id) payload.device_id = parseInt(used.device_id);
      if (used.city_id) payload.city_id = parseInt(used.city_id);

      const response = await api.resumenIaReportes(payload);
      setActionMessage(response?.mensaje ? `✓ ${response.mensaje}` : `✓ Resumen IA generado. ${response?.resumen?.substring(0, 100) ?? ""}`);
    } catch (err) {
      setActionMessage(`❌ Error al generar resumen: ${err.message ?? "No se pudo generar el resumen IA."}`);
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
            Ajusta los filtros de periodo, métrica, dispositivo y ciudad para consultar reportes.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginTop: "0.85rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Métrica
              </label>
              <select
                className="aq-input"
                value={filtros.metric}
                onChange={(e) => setFiltros({ ...filtros, metric: e.target.value })}
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
                value={filtros.granularity}
                onChange={(e) => setFiltros({ ...filtros, granularity: e.target.value })}
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
                value={filtros.start}
                onChange={(e) => setFiltros({ ...filtros, start: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Hasta (fecha)
              </label>
              <input
                type="date"
                className="aq-input"
                value={filtros.end}
                onChange={(e) => setFiltros({ ...filtros, end: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                Dispositivo
              </label>
              <select
                className="aq-input"
                value={filtros.device_id}
                onChange={(e) => setFiltros({ ...filtros, device_id: e.target.value })}
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
                value={filtros.city_id}
                onChange={(e) => setFiltros({ ...filtros, city_id: e.target.value })}
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


      </div>

      {reportResult && reportResult.series && reportResult.series.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <section className="aq-panel">
            <div className="aq-panel-title">
              <i className="bi bi-bar-chart-fill"></i>
              Resultados de la consulta
            </div>
            <div style={{ marginTop: "0.6rem" }}>
              {/* ChartComponent and TableComponent accept external `data` prop if provided */}
              <div style={{ marginBottom: "1rem" }}>
                <ChartComponent
                  data={reportResult.series.map((s, idx) => ({ 
                    fecha: s.label, 
                    ph: s.value,
                    index: idx
                  }))}
                  title={`Gráfica — ${filtros.metric.toUpperCase()} ${GRANULARITY_SINGULAR[filtros.granularity] || ""}`}
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
                    data={reportResult.rows?.map((r, idx) => ({
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
                  title={`Tabla — ${filtros.metric.toUpperCase()} por período`}
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
      {actionMessage && (
        <div style={{
          marginTop: "0.9rem",
          padding: "0.8rem 1rem",
          borderRadius: "8px",
          backgroundColor: actionMessage.startsWith("❌") ? "rgba(239, 68, 68, 0.1)" :
                           actionMessage.startsWith("✓") ? "rgba(34, 197, 94, 0.1)" :
                           actionMessage.startsWith("⚠️") ? "rgba(251, 146, 60, 0.1)" : 
                           "rgba(59, 130, 246, 0.1)",
          borderLeft: `4px solid ${actionMessage.startsWith("❌") ? "#ef4444" :
                                   actionMessage.startsWith("✓") ? "#22c55e" :
                                   actionMessage.startsWith("⚠️") ? "#fb923c" :
                                   "#3b82f6"}`,
          color: actionMessage.startsWith("❌") ? "#991b1b" :
                 actionMessage.startsWith("✓") ? "#15803d" :
                 actionMessage.startsWith("⚠️") ? "#92400e" :
                 "#1e40af",
          fontSize: "0.9rem"
        }}>
          {actionLoading ? "⏳ Procesando..." : actionMessage}
          {!actionLoading && exportDownloadUrl && (
            <div style={{ marginTop: "0.45rem" }}>
              <a href={exportDownloadUrl} target="_blank" rel="noreferrer" className="aq-link-button">
                Descargar archivo generado
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
