import { useEffect, useState } from "react";
import api from "../services/api";
import SurveyMap from "./SurveyMap";

export default function SurveyResults({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_city: [], by_education: [] });

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [responseRows, responseSummary] = await Promise.all([
        api.getSurveyResponses(300),
        api.getSurveySummary(),
      ]);

      setRows(Array.isArray(responseRows) ? responseRows : []);
      setSummary(responseSummary || { total: 0, by_city: [], by_education: [] });
    } catch (err) {
      setError(err.message || "No se pudieron cargar los resultados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="survey-card survey-card-wide">
      <div className="survey-header-row">
        <h2>Resultados de encuestas</h2>
        <div className="survey-inline-actions">
          <button className="survey-btn survey-btn-ghost" onClick={load} type="button">
            Actualizar
          </button>
          <button className="survey-btn survey-btn-ghost" onClick={onBack} type="button">
            Volver
          </button>
        </div>
      </div>

      {loading && <p>Cargando resultados...</p>}
      {error && <p className="survey-msg-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="survey-summary-grid">
            <article>
              <h3>Total de registros</h3>
              <p>{summary.total ?? 0}</p>
            </article>
            <article>
              <h3>Top ciudades</h3>
              <ul>
                {(summary.by_city || []).slice(0, 5).map((item) => (
                  <li key={item.selected_city}>
                    {item.selected_city}: {item.total}
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Nivel educativo</h3>
              <ul>
                {(summary.by_education || []).map((item) => (
                  <li key={item.education_level}>
                    {item.education_level}: {item.total}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <SurveyMap points={rows} />

          <div className="survey-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Ciudad</th>
                  <th>Educacion</th>
                  <th>Ubicacion</th>
                  <th>Direccion</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.full_name}</td>
                    <td>{row.document_id}</td>
                    <td>{row.selected_city}</td>
                    <td>{row.education_level}</td>
                    <td>
                      {Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}
                    </td>
                    <td>{row.address || "-"}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
