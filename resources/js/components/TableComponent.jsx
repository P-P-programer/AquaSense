import { useEffect, useState } from "react";
import api from "../services/api";

const estadoLabel = { ok: "Normal", warn: "Alerta", danger: "Crítico" };

export default function TableComponent() {
  const [data,  setData]  = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getRegistros()
      .then(registros => {
        // Muestra los 6 más recientes, del más nuevo al más viejo
        setData([...registros].reverse().slice(0, 6));
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) return (
    <div className="aq-alert-error">
      <i className="bi bi-exclamation-triangle"></i> Error cargando registros: {error}
    </div>
  );

  if (!data.length) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando registros...
    </div>
  );

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-table"></i>
        Registros históricos
      </div>
      <table className="aq-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Consumo (L)</th>
            <th>pH</th>
            <th>Turbidez</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td>{r.fecha}</td>
              <td>{r.consumo}</td>
              <td>{r.ph ?? "—"}</td>
              <td>{r.turbidez != null ? `${r.turbidez} NTU` : "—"}</td>
              <td>
                <span className={`aq-badge ${r.estado ?? "ok"}`}>
                  {estadoLabel[r.estado] ?? "Normal"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
