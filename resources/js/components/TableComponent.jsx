import { useEffect, useState } from "react";
import api from "../services/api";

const estadoLabel = { ok: "Normal", warn: "Alerta", danger: "Crítico" };

export default function TableComponent() {
  const [data,  setData]  = useState([]);
  const [cities, setCities] = useState([]);
  const [cityFilter, setCityFilter] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedCity = cities.find((city) => String(city.id) === String(cityFilter)) ?? null;
  const citySuggestions = cityQuery.trim()
    ? cities.filter((city) => {
        const haystack = `${city.name} ${city.department}`.toLowerCase();
        return haystack.includes(cityQuery.trim().toLowerCase());
      }).slice(0, 8)
    : cities.slice(0, 8);

  useEffect(() => {
    setLoading(true);
    api.getRegistros({
      city_id: cityFilter || undefined,
      limit: 20,
    })
      .then(registros => {
        // Muestra los 10 más recientes, del más nuevo al más viejo
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
        Registros actuales
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
      {!data.length ? (
        <div className="aq-empty-state">
          No hay lecturas para el filtro actual. Puedes cambiar la ciudad o escribir otra opción sin perder los controles.
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
      )}
    </div>
  );
}
