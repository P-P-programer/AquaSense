import { useEffect, useState } from "react";
import api from "../services/api";

const estadoLabel = { ok: "Normal", warn: "Alerta", danger: "Crítico" };

export default function TableComponent({ data: externalData = null, title = null, limit = 10, resultFiltros = null, setResultFiltros = null, onRunQuery = null, onExport = null, onIa = null, devices = [] }) {
  const [data,  setData]  = useState(Array.isArray(externalData) ? externalData.slice(0, limit) : []);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localFilters, setLocalFilters] = useState(resultFiltros ?? {
    metric: "ph",
    granularity: "week",
    start: "",
    end: "",
    device_id: "",
    city_id: "",
  });


  const selectedCity = cities.find((city) => String(city.id) === String(cityFilter)) ?? null;
  const citySuggestions = cityQuery.trim()
    ? cities.filter((city) => {
        const haystack = `${city.name} ${city.department}`.toLowerCase();
        return haystack.includes(cityQuery.trim().toLowerCase());
      }).slice(0, 8)
    : cities.slice(0, 8);

  useEffect(() => {
    if (Array.isArray(externalData)) {
      setLoading(false);
      setError(null);
      setData(externalData.slice(0, limit));
      // Reset city filter when external data is present (data is already filtered)
      setCityFilter("");
      setCityQuery("");
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    api.getRegistros({
      city_id: cityFilter || undefined,
      limit: 20,
    })
      .then(registros => {
        // Muestra los `limit` más recientes, del más nuevo al más viejo
        setData(Array.isArray(registros) ? registros.slice(0, limit) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [cityFilter, externalData, limit]);

  useEffect(() => {
    if (resultFiltros) setLocalFilters(resultFiltros);
  }, [resultFiltros]);

  useEffect(() => {
    api.getCities()
      .then((response) => setCities(Array.isArray(response) ? response : []))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setCityQuery(selectedCity ? `${selectedCity.name} (${selectedCity.department})` : "");
  }, [selectedCity]);

  function selectCity(city) {
    setCityFilter(String(city.id));
    setCityQuery(`${city.name} (${city.department})`);
    setShowSuggestions(false);
    setLocalFilters((prev) => ({ ...prev, city_id: city.id }));
  }

  function clearCityFilter() {
    setCityFilter("");
    setCityQuery("");
    setShowSuggestions(false);
    setLocalFilters((prev) => ({ ...prev, city_id: "" }));
  }

  if (error) return (
    <div className="aq-alert-error">
      <i className="bi bi-exclamation-triangle"></i> Error cargando registros: {error}
    </div>
  );

  if (loading) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando registros...
    </div>
  );

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-table"></i>
        {title ?? "Registros actuales"}
      </div>
      {/* Inline result filters and actions */}
      {(onRunQuery || onExport || onIa || resultFiltros) && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="date"
              className="aq-input"
              value={localFilters.start || ""}
              onChange={(e) => setLocalFilters((p) => ({ ...p, start: e.target.value }))}
              style={{ width: 150 }}
            />
            <input
              type="date"
              className="aq-input"
              value={localFilters.end || ""}
              onChange={(e) => setLocalFilters((p) => ({ ...p, end: e.target.value }))}
              style={{ width: 150 }}
            />
            <select
              className="aq-input"
              value={localFilters.device_id || ""}
              onChange={(e) => setLocalFilters((p) => ({ ...p, device_id: e.target.value }))}
            >
              <option value="">Todos dispositivos</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              className="aq-input"
              value={localFilters.granularity || "week"}
              onChange={(e) => setLocalFilters((p) => ({ ...p, granularity: e.target.value }))}
            >
              <option value="day">Diario</option>
              <option value="week">Semanal</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
            </select>
            <button
              type="button"
              className="aq-btn"
              onClick={() => {
                if (setResultFiltros) setResultFiltros(localFilters);
                if (onRunQuery) onRunQuery(localFilters);
              }}
            >
              Aplicar filtros
            </button>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="aq-btn-secondary"
              onClick={() => onExport ? onExport("xlsx", localFilters) : null}
            >Exportar Excel</button>
            <button
              type="button"
              className="aq-btn-secondary"
              onClick={() => onExport ? onExport("docx", localFilters) : null}
            >Exportar Word</button>
            <button
              type="button"
              className="aq-btn-secondary"
              onClick={() => onIa ? onIa(localFilters) : null}
            >Resumen IA</button>
          </div>
        </div>
      )}

      {/* Only show city filter when NO external data is present (Table used independently) */}
      {!Array.isArray(externalData) && (
      <div className="aq-alerts-filters" style={{ marginBottom: "0.65rem" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            className="aq-input"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar ciudad..."
          />
          {showSuggestions && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "var(--blanco)",
              border: "1px solid var(--borde)",
              borderRadius: 10,
              boxShadow: "var(--sombra)",
              maxHeight: 240,
              overflowY: "auto",
            }}>
              <button
                type="button"
                className="aq-link-button"
                style={{ width: "100%", textAlign: "left", padding: "0.7rem 0.9rem" }}
                onClick={clearCityFilter}
              >
                Todas las ciudades
              </button>
              {citySuggestions.length > 0 ? citySuggestions.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="aq-link-button"
                  style={{ width: "100%", textAlign: "left", padding: "0.7rem 0.9rem" }}
                  onClick={() => selectCity(city)}
                >
                  {city.name} ({city.department})
                </button>
              )) : (
                <div style={{ padding: "0.7rem 0.9rem", color: "var(--texto-secundario)" }}>
                  No hay coincidencias
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="aq-btn-secondary"
          onClick={clearCityFilter}
          style={{ minWidth: 140 }}
        >
          Limpiar filtro
        </button>
      </div>
      )}
      {!data.length ? (
        <div className="aq-empty-state">
          No hay datos para mostrar. Intenta ajustar los filtros.
        </div>
      ) : (
        // Usar indicador explícito de tipo si está disponible, sino asumir basándose en estructura
        (data[0]?.dataType === "aggregated" || (!data[0]?.dataType && data[0]?.avg !== undefined)) ? (
          // Tabla de datos agregados (desde ReportesService)
          <table className="aq-table aq-registros-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Promedio</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Muestras</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td data-label="Período">{r.label ?? r.fecha ?? "—"}</td>
                  <td data-label="Promedio" style={{ fontWeight: 600 }}>{r.avg ?? "—"}</td>
                  <td data-label="Mínimo">{r.min ?? "—"}</td>
                  <td data-label="Máximo">{r.max ?? "—"}</td>
                  <td data-label="Muestras" style={{ textAlign: "center" }}>{r.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Tabla de registros individuales (vista normal)
          <table className="aq-table aq-registros-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Ciudad</th>
                <th>Dispositivo</th>
                <th>pH</th>
                <th>Turbidez</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td data-label="Fecha y hora">{r.fecha}</td>
                  <td data-label="Ciudad">{r.city_name ?? "Sin ciudad"}</td>
                  <td data-label="Dispositivo">{r.device_name ?? "—"}</td>
                  <td data-label="pH">{r.ph ?? "—"}</td>
                  <td data-label="Turbidez">{r.turbidez != null ? `${r.turbidez} NTU` : "—"}</td>
                  <td data-label="Estado">
                    <span className={`aq-badge ${r.estado ?? "ok"}`}>
                      {estadoLabel[r.estado] ?? "Normal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
