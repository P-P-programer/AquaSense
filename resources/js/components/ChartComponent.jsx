import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function buildSmoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

function toShortTimeLabel(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChartComponent() {
  const [data,  setData]  = useState([]);
  const [cities, setCities] = useState([]);
  const [safeRange, setSafeRange] = useState({ safeMin: null, safeMax: null });
  const [cityFilter, setCityFilter] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedCity = useMemo(
    () => cities.find((city) => String(city.id) === String(cityFilter)) ?? null,
    [cities, cityFilter],
  );

  const citySuggestions = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    const base = query
      ? cities.filter((city) => `${city.name} ${city.department}`.toLowerCase().includes(query))
      : cities;

    return base.slice(0, 8);
  }, [cities, cityQuery]);

  useEffect(() => {
    setLoading(true);
    api.getRegistros({
      city_id: cityFilter || undefined,
      limit: 20,
    })
      .then(registros => {
        // Toma los últimos 10 registros para la gráfica
        setData(Array.isArray(registros) ? registros.slice(0, 10) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [cityFilter]);

  useEffect(() => {
    api.getCities()
      .then((response) => setCities(Array.isArray(response) ? response : []))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    api.getMyAlertPreferences()
      .then((response) => {
        const safeMin = response?.ph_safe_min;
        const safeMax = response?.ph_safe_max;

        setSafeRange({
          safeMin: Number.isFinite(Number(safeMin)) ? Number(safeMin) : null,
          safeMax: Number.isFinite(Number(safeMax)) ? Number(safeMax) : null,
        });
      })
      .catch(() => {
        setSafeRange({ safeMin: null, safeMax: null });
      });
  }, []);

  useEffect(() => {
    setCityQuery(selectedCity ? `${selectedCity.name} (${selectedCity.department})` : "");
  }, [selectedCity]);

  function selectCity(city) {
    setCityFilter(String(city.id));
    setCityQuery(`${city.name} (${city.department})`);
    setShowSuggestions(false);
  }

  function clearCityFilter() {
    setCityFilter("");
    setCityQuery("");
    setShowSuggestions(false);
  }

  if (error) return (
    <div className="aq-alert-error">
      <i className="bi bi-exclamation-triangle"></i> Error cargando gráfica: {error}
    </div>
  );

  if (loading) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando gráfica...
    </div>
  );

  const points = data
    .slice()
    .reverse()
    .map((row, index) => ({
      x: index,
      y: Number(row.ph ?? 0),
      label: row.fecha,
      city: row.city_name ?? "Sin ciudad",
      device: row.device_name ?? "—",
    }));

  const rawMax = points.length ? Math.max(...points.map((point) => point.y)) : 0;
  const rawMin = points.length ? Math.min(...points.map((point) => point.y)) : 0;
  const average = points.length
    ? points.reduce((acc, point) => acc + point.y, 0) / points.length
    : 0;

  const yMin = Math.max(0, Math.floor((rawMin - 0.25) * 10) / 10);
  const yMax = Math.min(14, Math.ceil((rawMax + 0.25) * 10) / 10);
  const range = Math.max(0.5, yMax - yMin || 0.5);

  const chartWidth = 640;
  const chartHeight = 280;
  const margin = { top: 22, right: 16, bottom: 38, left: 44 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  const baseY = margin.top + innerHeight;

  const chartPoints = points.map((point, index) => {
    const x = points.length > 1
      ? margin.left + (index / (points.length - 1)) * innerWidth
      : margin.left + innerWidth / 2;

    const normalizedY = (point.y - yMin) / range;
    const y = margin.top + innerHeight - normalizedY * innerHeight;

    return {
      ...point,
      phValue: point.y,
      x,
      y,
      shortTime: toShortTimeLabel(point.label),
    };
  });

  const pathD = buildSmoothPath(chartPoints);
  const areaD = chartPoints.length > 1
    ? `${pathD} L ${chartPoints[chartPoints.length - 1].x},${baseY} L ${chartPoints[0].x},${baseY} Z`
    : "";

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = yMin + (range * index) / 4;
    const y = margin.top + innerHeight - (innerHeight * index) / 4;
    return { value, y };
  });

  const hasSafeRange =
    Number.isFinite(safeRange.safeMin) &&
    Number.isFinite(safeRange.safeMax) &&
    safeRange.safeMin < safeRange.safeMax;

  const clamp = (value, minValue, maxValue) => Math.min(maxValue, Math.max(minValue, value));
  const scaleY = (value) => {
    const normalized = (value - yMin) / range;
    return margin.top + innerHeight - normalized * innerHeight;
  };

  const safeBandTopValue = hasSafeRange ? clamp(safeRange.safeMax, yMin, yMax) : null;
  const safeBandBottomValue = hasSafeRange ? clamp(safeRange.safeMin, yMin, yMax) : null;
  const safeBandTopY = hasSafeRange ? scaleY(safeBandTopValue) : null;
  const safeBandBottomY = hasSafeRange ? scaleY(safeBandBottomValue) : null;
  const safeBandHeight =
    hasSafeRange && safeBandTopY != null && safeBandBottomY != null
      ? Math.max(0, safeBandBottomY - safeBandTopY)
      : 0;

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-bar-chart-fill"></i>
        Tendencia de pH — últimos 10 registros
      </div>
      <div className="aq-alerts-filters" style={{ marginBottom: "0.65rem" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
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
                onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
        <button type="button" className="aq-btn-secondary" onClick={clearCityFilter}>
          Limpiar filtro
        </button>
      </div>
      {!data.length ? (
        <div className="aq-empty-state">
          No hay lecturas para el filtro actual. Puedes cambiar ciudad o búsqueda sin perder los controles.
        </div>
      ) : (
        <div className="aq-linechart-shell">
          <div className="aq-linechart-meta">
            <div className="aq-linechart-chip">
              <span>Min</span>
              <strong>{rawMin.toFixed(2)}</strong>
            </div>
            <div className="aq-linechart-chip">
              <span>Promedio</span>
              <strong>{average.toFixed(2)}</strong>
            </div>
            <div className="aq-linechart-chip">
              <span>Max</span>
              <strong>{rawMax.toFixed(2)}</strong>
            </div>
            <div className="aq-linechart-chip aq-linechart-chip-safe">
              <span>Rango seguro</span>
              <strong>
                {hasSafeRange
                  ? `${safeRange.safeMin.toFixed(2)} - ${safeRange.safeMax.toFixed(2)}`
                  : "Global"}
              </strong>
            </div>
          </div>

          <div className="aq-linechart-canvas">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
              <defs>
                <linearGradient id="phLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--azul-profundo)" />
                  <stop offset="100%" stopColor="var(--azul-agua)" />
                </linearGradient>

                <linearGradient id="phAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(14, 165, 233, 0.35)" />
                  <stop offset="100%" stopColor="rgba(14, 165, 233, 0.04)" />
                </linearGradient>
              </defs>

              {yTicks.map((tick) => (
                <g key={`tick-${tick.value.toFixed(2)}`}>
                  <line
                    x1={margin.left}
                    y1={tick.y}
                    x2={margin.left + innerWidth}
                    y2={tick.y}
                    stroke="rgba(15,23,42,0.08)"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 8}
                    y={tick.y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="rgba(75,106,138,0.9)"
                  >
                    {tick.value.toFixed(1)}
                  </text>
                </g>
              ))}

              <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={baseY}
                stroke="rgba(15,23,42,0.2)"
                strokeWidth="1.2"
              />

              <line
                x1={margin.left}
                y1={baseY}
                x2={margin.left + innerWidth}
                y2={baseY}
                stroke="rgba(15,23,42,0.2)"
                strokeWidth="1.2"
              />

              {hasSafeRange && safeBandTopY != null && safeBandHeight > 0 && (
                <>
                  <rect
                    x={margin.left}
                    y={safeBandTopY}
                    width={innerWidth}
                    height={safeBandHeight}
                    fill="rgba(16, 185, 129, 0.12)"
                  />
                  <line
                    x1={margin.left}
                    y1={safeBandTopY}
                    x2={margin.left + innerWidth}
                    y2={safeBandTopY}
                    stroke="rgba(5, 150, 105, 0.45)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <line
                    x1={margin.left}
                    y1={safeBandBottomY}
                    x2={margin.left + innerWidth}
                    y2={safeBandBottomY}
                    stroke="rgba(5, 150, 105, 0.45)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                </>
              )}

              {areaD && (
                <path d={areaD} fill="url(#phAreaGradient)" />
              )}

              {chartPoints.length > 1 && (
                <path d={pathD} fill="none" stroke="url(#phLineGradient)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              )}

              {chartPoints.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle cx={point.x} cy={point.y} r="4.4" fill="rgba(14,165,233,0.2)" />
                  <circle cx={point.x} cy={point.y} r="2.6" fill="var(--azul-profundo)" />
                  <title>{`${point.shortTime} · pH ${point.phValue.toFixed(2)} · ${point.device}`}</title>
                </g>
              ))}

              {chartPoints.map((point, index) => (
                <text
                  key={`x-${point.label}-${index}`}
                  x={point.x}
                  y={baseY + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(75,106,138,0.9)"
                >
                  {index % 2 === 0 || index === chartPoints.length - 1 ? point.shortTime : ""}
                </text>
              ))}
            </svg>
          </div>

          <div className="aq-table-meta">
            Curva suavizada con escala dinámica de pH.
            {hasSafeRange
              ? ` Banda verde: rango seguro configurado para tu cuenta (${safeRange.safeMin.toFixed(2)}-${safeRange.safeMax.toFixed(2)}).`
              : " Banda verde desactivada: se usa configuración global sin rango personalizado en esta vista."}
          </div>
        </div>
      )}
    </div>
  );
}
