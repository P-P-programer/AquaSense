import { Fragment, useEffect, useState } from "react";
import api from "../services/api";

const estadoLabel = { ok: "Normal", warn: "Alerta", danger: "Crítico" };

function buildLinePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");
}

function buildDetailSeries(rows, activeIndex) {
  const windowRadius = 4;
  const start = Math.max(0, activeIndex - windowRadius);
  const end = Math.min(rows.length - 1, activeIndex + windowRadius);

  const slicedRows = rows.slice(start, end + 1);

  const actual = slicedRows.map((row, index) => ({
    label: row.label ?? row.fecha ?? `P${start + index + 1}`,
    value: Number.isFinite(Number(row.avg)) ? Number(row.avg) : 0,
    isAnomaly: Boolean(row.is_anomaly),
    anomalyReason: row.anomaly_reason ?? null,
    anomalyScore: row.anomaly_score ?? null,
    originalIndex: start + index,
    expected: null,
  }));

  const expected = actual.map((point, index) => {
    const historyStart = Math.max(0, index - 3);
    const history = actual.slice(historyStart, index).map((item) => item.value);
    const expectedValue = history.length
      ? history.reduce((sum, value) => sum + value, 0) / history.length
      : point.value;

    return {
      ...point,
      expected: expectedValue,
    };
  });

  return {
    rows: expected,
    activeIndex: activeIndex - start,
  };
}

function MiniComparisonChart({ rows, activeIndex }) {
  if (!rows.length) return null;

  const chartWidth = 620;
  const chartHeight = 190;
  const margin = { top: 18, right: 14, bottom: 28, left: 42 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const values = rows.flatMap((row) => [row.value, row.expected]).filter((value) => Number.isFinite(value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const range = Math.max(0.5, maxValue - minValue || 0.5);

  const points = rows.map((row, index) => {
    const x = rows.length > 1
      ? margin.left + (index / (rows.length - 1)) * innerWidth
      : margin.left + innerWidth / 2;

    const scale = (value) => margin.top + innerHeight - (((value - minValue) / range) * innerHeight);

    return {
      ...row,
      x,
      actualY: scale(row.value),
      expectedY: scale(row.expected),
    };
  });

  const actualPath = buildLinePath(points.map((point) => ({ x: point.x, y: point.actualY })));
  const expectedPath = buildLinePath(points.map((point) => ({ x: point.x, y: point.expectedY })));

  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = minValue + (range * index) / 3;
    const y = margin.top + innerHeight - (innerHeight * index) / 3;
    return { value, y };
  });

  return (
    <div className="aq-report-mini-chart">
      <div className="aq-report-mini-chart-note">
        La línea <strong>esperada</strong> estima el comportamiento normal con los puntos previos; la línea <strong>real</strong> muestra la medición obtenida; el <strong>pico</strong> marca los valores que se alejan del patrón.
      </div>
      <div className="aq-report-mini-chart-legend">
        <div className="aq-report-mini-chart-legend-item">
          <span className="aq-report-mini-chart-legend-title"><i className="bi bi-dash-lg"></i> Esperado</span>
          <small>Línea estimada con el promedio de los puntos previos.</small>
        </div>
        <div className="aq-report-mini-chart-legend-item">
          <span className="aq-report-mini-chart-legend-title"><i className="bi bi-graph-up"></i> Real</span>
          <small>Lo que realmente midió el sistema en ese período.</small>
        </div>
        <div className="aq-report-mini-chart-legend-item">
          <span className="aq-report-mini-chart-legend-title"><i className="bi bi-dot"></i> Pico</span>
          <small>Punto que se sale del rango esperado y se marca como anomalía.</small>
        </div>
      </div>

      <div className="aq-report-mini-chart-canvas">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          {yTicks.map((tick) => (
            <g key={`mini-tick-${tick.value.toFixed(2)}`}>
              <line
                x1={margin.left}
                y1={tick.y}
                x2={margin.left + innerWidth}
                y2={tick.y}
                stroke="rgba(15,23,42,0.06)"
                strokeWidth="1"
              />
              <text
                x={margin.left - 6}
                y={tick.y + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgba(75,106,138,0.82)"
              >
                {tick.value.toFixed(1)}
              </text>
            </g>
          ))}

          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            stroke="rgba(15,23,42,0.14)"
            strokeWidth="1"
          />

          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            stroke="rgba(15,23,42,0.14)"
            strokeWidth="1"
          />

          {expectedPath && (
            <path
              d={expectedPath}
              fill="none"
              stroke="rgba(37, 99, 235, 0.55)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="url(#reportMiniActualGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <defs>
            <linearGradient id="reportMiniActualGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--azul-profundo)" />
              <stop offset="100%" stopColor="var(--azul-agua)" />
            </linearGradient>
          </defs>

          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={point.x} cy={point.actualY} r={index === activeIndex ? 5.8 : 3.8} fill={point.isAnomaly ? "#ef4444" : "rgba(14,165,233,0.2)"} />
              <circle cx={point.x} cy={point.actualY} r={index === activeIndex ? 3.2 : 2.2} fill={point.isAnomaly ? "#b91c1c" : "var(--azul-profundo)"} />
              {point.isAnomaly && (
                <circle cx={point.x} cy={point.actualY} r="8" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="1.2" />
              )}
              <title>{`${point.label} · real ${point.value.toFixed(2)} · esperado ${point.expected.toFixed(2)}${point.isAnomaly ? ` · pico ${point.anomalyScore ?? ''}` : ''}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function TableComponent({ data: externalData = null, title = null, limit = 10, resultFiltros = null, setResultFiltros = null, onRunQuery = null, onExport = null, onIa = null, devices = [] }) {
  const [data,  setData]  = useState(Array.isArray(externalData) ? externalData.slice(0, limit) : []);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);
  const [localFilters, setLocalFilters] = useState(resultFiltros ?? {
    metric: "ph",
    granularity: "week",
    start: "",
    end: "",
    device_id: "",
    city_id: "",
  });


  const selectedCity = cities.find((city) => String(city.id) === String(cityFilter)) ?? null;
  const selectedDevice = devices.find((device) => String(device.id) === String(localFilters.device_id)) ?? null;
  const filterSummary = [
    { label: "Granularidad", value: localFilters.granularity || "week" },
    { label: "Ciudad", value: selectedCity ? selectedCity.name : "Todas" },
    { label: "Dispositivo", value: selectedDevice ? selectedDevice.name : "Todos" },
    { label: "Periodo", value: [localFilters.start || "inicio", localFilters.end || "hoy"].join(" → ") },
  ];
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
      setExpandedRowIndex(null);
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

  useEffect(() => {
    if (!localFilters.city_id) {
      setCityFilter("");
      setCityQuery("");
      setShowSuggestions(false);
      return;
    }

    const city = cities.find((item) => String(item.id) === String(localFilters.city_id));
    if (city) {
      setCityFilter(String(city.id));
      setCityQuery(`${city.name} (${city.department})`);
    }
  }, [cities, localFilters.city_id]);

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

  function toggleRowDetails(index) {
    setExpandedRowIndex(index);
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

      {/* ── Acciones y filtros rápidos ───────────────────── */}
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
              value={localFilters.city_id || ""}
              onChange={(e) => {
                const nextCityId = e.target.value;
                setLocalFilters((p) => ({ ...p, city_id: nextCityId }));
                if (nextCityId) {
                  const nextCity = cities.find((city) => String(city.id) === String(nextCityId));
                  setCityFilter(String(nextCityId));
                  setCityQuery(nextCity ? `${nextCity.name} (${nextCity.department})` : "");
                  setShowSuggestions(false);
                } else {
                  clearCityFilter();
                }
              }}
            >
              <option value="">Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
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

      {/* ── Filtro de ciudad independiente ───────────────── */}
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
        (data[0]?.dataType === "aggregated" || (!data[0]?.dataType && data[0]?.avg !== undefined)) ? (
          <div className="aq-table-responsive">
            <table className="aq-table aq-registros-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Promedio</th>
                <th>Estado</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Muestras</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <Fragment key={`row-group-${i}`}>
                <tr className={expandedRowIndex === i ? "aq-report-row is-expanded" : "aq-report-row"} onClick={() => toggleRowDetails(i)} style={{ cursor: "pointer" }}>
                  <td data-label="Período">{r.label ?? r.fecha ?? "—"}</td>
                  <td data-label="Promedio" style={{ fontWeight: 600 }}>
                    <span className="aq-report-value">{r.avg ?? "—"}</span>
                  </td>
                  <td data-label="Estado">
                    <button
                      type="button"
                      className={`aq-report-status-trigger ${r.is_anomaly ? "aq-anomaly-badge" : "aq-anomaly-badge aq-anomaly-badge--normal"}`}
                      title={r.is_anomaly
                        ? `${r.anomaly_reason ?? 'Anomalía detectada'}${r.anomaly_score ? ` — score: ${r.anomaly_score}` : ''}`
                        : 'Serie normal, sin picos detectados.'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowDetails(i);
                      }}
                    >
                      {r.is_anomaly ? 'ANOMALÍA' : 'NORMAL'}
                      <i className={`bi ${expandedRowIndex === i ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                    </button>
                  </td>
                  <td data-label="Mínimo">{r.min ?? "—"}</td>
                  <td data-label="Máximo">{r.max ?? "—"}</td>
                  <td data-label="Muestras" style={{ textAlign: "center" }}>{r.count ?? 0}</td>
                </tr>
                {expandedRowIndex === i && (() => {
                  const detailSeries = buildDetailSeries(data, i);

                  return (
                  <tr key={`detail-${i}`} className="aq-report-detail-row">
                    <td colSpan={7}>
                      <div className="aq-report-detail">
                        <div className="aq-report-detail-header">
                          <div>
                            <div className="aq-report-detail-title">Detalle del período {r.label ?? r.fecha ?? "—"}</div>
                            <div className="aq-report-detail-subtitle">
                              {r.is_anomaly
                                ? `Se detectó una anomalía. Score: ${r.anomaly_score ?? 'N/D'}.`
                                : 'No se detectaron anomalías en este período.'}
                            </div>
                          </div>
                          <button type="button" className="aq-link-button" onClick={() => setExpandedRowIndex(null)}>
                            Cerrar
                          </button>
                        </div>

                        <div className="aq-report-detail-grid">
                          <div className="aq-report-detail-card">
                            <span>Promedio</span>
                            <strong>{r.avg ?? '—'}</strong>
                          </div>
                          <div className="aq-report-detail-card">
                            <span>Estado</span>
                            <strong>{r.is_anomaly ? 'ANOMALÍA' : 'NORMAL'}</strong>
                          </div>
                          <div className="aq-report-detail-card">
                            <span>Score</span>
                            <strong>{r.anomaly_score ?? '—'}</strong>
                          </div>
                          <div className="aq-report-detail-card">
                            <span>Motivo</span>
                            <strong>{r.anomaly_reason ?? 'Sin observaciones'}</strong>
                          </div>
                        </div>

                        <MiniComparisonChart rows={detailSeries.rows} activeIndex={detailSeries.activeIndex} />
                      </div>
                    </td>
                  </tr>
                  );
                })()}
                </Fragment>
              ))}
            </tbody>
            </table>
          </div>
        ) : (
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
