import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function ChartComponent() {
  const [data,  setData]  = useState([]);
  const [cities, setCities] = useState([]);
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

  const max = points.length ? Math.max(...points.map((point) => point.y)) : 0;
  const min = points.length ? Math.min(...points.map((point) => point.y)) : 0;
  const range = Math.max(0.5, max - min || 0.5);

  const chartHeight = 220;
  const chartWidth = 100;
  const chartPoints = points.map((point, index) => {
    const x = points.length > 1 ? (index / (points.length - 1)) * chartWidth : chartWidth / 2;
    const normalizedY = ((point.y - min) / range) * (chartHeight - 30);
    const y = chartHeight - 20 - normalizedY;
    return { ...point, x, y };
  });

  const pathD = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-bar-chart-fill"></i>
        Tendencia de pH — últimos 10 registros
      </div>
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
        <button type="button" className="aq-btn-secondary" onClick={clearCityFilter} style={{ minWidth: 140 }}>
          Limpiar filtro
        </button>
      </div>
      {!data.length ? (
        <div className="aq-empty-state">
          No hay lecturas para el filtro actual. Puedes cambiar ciudad o búsqueda sin perder los controles.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <div style={{ position: "relative", width: "100%", height: chartHeight, borderRadius: 12, background: "linear-gradient(180deg, #f8fbff 0%, #eef7ff 100%)", border: "1px solid var(--borde)" }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" width="100%" height="100%">
              <defs>
                <linearGradient id="phLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--azul-profundo)" />
                  <stop offset="100%" stopColor="var(--azul-agua)" />
                </linearGradient>
              </defs>

              <line x1="0" y1={chartHeight - 20} x2={chartWidth} y2={chartHeight - 20} stroke="rgba(15,23,42,0.15)" strokeWidth="0.8" />
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="rgba(15,23,42,0.08)" strokeWidth="0.8" />

              {chartPoints.length > 1 && (
                <path d={pathD} fill="none" stroke="url(#phLineGradient)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              )}

              {chartPoints.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle cx={point.x} cy={point.y} r="1.8" fill="var(--azul-profundo)" />
                </g>
              ))}
            </svg>

            <div style={{ position: "absolute", left: 8, top: 8, fontSize: "0.72rem", color: "var(--texto-secundario)" }}>
              pH min: {min.toFixed(2)}
            </div>
            <div style={{ position: "absolute", right: 8, top: 8, fontSize: "0.72rem", color: "var(--texto-secundario)" }}>
              pH max: {max.toFixed(2)}
            </div>
          </div>

          <div className="aq-table-meta">
            Vista basada en los últimos registros recibidos, ordenados por fecha y hora.
          </div>
        </div>
      )}
    </div>
  );
}
