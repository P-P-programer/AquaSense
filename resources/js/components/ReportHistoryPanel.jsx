import { useEffect, useState } from "react";
import api from "../services/api";

export default function ReportHistoryPanel({ isAdmin }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [scope, setScope] = useState("mine");
  const [filters, setFilters] = useState({
    action_type: "",
    format: "",
    user_id: "",
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    cargarHistorial();
    if (isAdmin) {
      cargarUsuarios();
    }
  }, [scope, filters]);

  async function cargarHistorial() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        scope,
        action_type: filters.action_type || undefined,
        format: filters.format || undefined,
        user_id: filters.user_id || undefined,
        limit: 50,
      };

      // Remover undefined para no incluir en query string
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );

      const response = await api.obtenerHistorialReportes(params);
      setActivities(response?.items ?? []);
    } catch (err) {
      setError(err.message ?? "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  async function cargarUsuarios() {
    try {
      const data = await api.getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  }

  async function descargarReporte(activityId, fileName) {
    setDownloading(activityId);
    try {
      // El endpoint descarga automáticamente
      window.location.href = `/api/reportes/export/download/${activityId}`;
      // Pequeña espera antes de permitir otra descarga
      setTimeout(() => setDownloading(null), 500);
    } catch (err) {
      alert(`Error descargando: ${err.message}`);
      setDownloading(null);
    }
  }

  function formatearFecha(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  function obtenerEtiquetaAccion(actionType) {
    return actionType === "export" ? "Exportación" : "Resumen IA";
  }

  if (loading) {
    return (
      <section className="aq-panel">
        <div className="aq-loading">
          <div className="aq-spinner"></div>
          Cargando historial...
        </div>
      </section>
    );
  }

  return (
    <section className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-clock-history"></i>
        Historial de Reportes
      </div>
      <p className="aq-table-meta" style={{ marginTop: 0 }}>
        Auditoría de exportaciones y resúmenes generados. Admin puede ver reportes
        de todos los usuarios.
      </p>

      {error && (
        <div className="aq-alert-error">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isAdmin ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            gap: "0.65rem",
          }}
        >
          {isAdmin && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.3rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                Vista
              </label>
              <select
                className="aq-input"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="mine">Mis reportes</option>
                <option value="all">Todos los reportes</option>
              </select>
            </div>
          )}

          {isAdmin && scope === "all" && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.3rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                Usuario
              </label>
              <select
                className="aq-input"
                value={filters.user_id}
                onChange={(e) =>
                  setFilters({ ...filters, user_id: e.target.value })
                }
              >
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Tipo
            </label>
            <select
              className="aq-input"
              value={filters.action_type}
              onChange={(e) =>
                setFilters({ ...filters, action_type: e.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="export">Exportaciones</option>
              <option value="ia_summary">Resúmenes IA</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Formato
            </label>
            <select
              className="aq-input"
              value={filters.format}
              onChange={(e) =>
                setFilters({ ...filters, format: e.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="xlsx">Excel</option>
              <option value="docx">Word</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de historial */}
      {activities.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1rem",
            color: "#666",
          }}
        >
          <i
            className="bi bi-inbox"
            style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
          ></i>
          <p>No hay reportes disponibles con los filtros seleccionados.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #ddd",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Fecha</th>
                {isAdmin && (
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>
                    Usuario
                  </th>
                )}
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Tipo</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>
                  Formato
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>
                  Métrica
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>
                  Período
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Filas</th>
                <th style={{ padding: "0.75rem", textAlign: "center" }}>
                  Descargar
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr
                  key={activity.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    hover: "backgroundColor: #f9f9f9",
                  }}
                >
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {formatearFecha(activity.created_at)}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                      <div>
                        <strong>{activity.user?.name || "—"}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                          {activity.user?.email || "—"}
                        </div>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor:
                          activity.action_type === "export"
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(168, 85, 247, 0.1)",
                        color:
                          activity.action_type === "export"
                            ? "#1e40af"
                            : "#6b21a8",
                        fontSize: "0.85rem",
                      }}
                    >
                      {obtenerEtiquetaAccion(activity.action_type)}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {activity.format?.toUpperCase() || "—"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {activity.metric?.toUpperCase() || "—"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {activity.granularity || "—"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                    {activity.rows_count !== null ? activity.rows_count : "—"}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {activity.action_type === "export" && activity.file_name ? (
                      <button
                        type="button"
                        className="aq-btn-sm"
                        onClick={() =>
                          descargarReporte(activity.id, activity.file_name)
                        }
                        disabled={downloading === activity.id}
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        {downloading === activity.id ? (
                          <>
                            <span className="aq-spinner-mini"></span> ...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-download"></i> Descargar
                          </>
                        )}
                      </button>
                    ) : (
                      <span style={{ color: "#999" }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#666" }}>
        Mostrando {activities.length} registros • Los archivos son accesibles
        solo por usuarios autenticados y dueños de la exportación (o admin)
      </p>
    </section>
  );
}
