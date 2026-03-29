import { useEffect, useState } from "react";
import api from "../services/api";

export default function ChartComponent() {
  const [data,  setData]  = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getRegistros()
      .then(registros => {
        // Toma los últimos 7 registros para la gráfica
        setData(registros.slice(-7));
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) return (
    <div className="aq-alert-error">
      <i className="bi bi-exclamation-triangle"></i> Error cargando gráfica: {error}
    </div>
  );

  if (!data.length) return (
    <div className="aq-loading">
      <div className="aq-spinner"></div>
      Cargando gráfica...
    </div>
  );

  const max = Math.max(...data.map(d => d.consumo));

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-bar-chart-fill"></i>
        Consumo diario — últimos 7 días
      </div>
      <div className="aq-bar-chart">
        {data.map((r, i) => (
          <div className="aq-bar-row" key={i}>
            <span className="aq-bar-label">{r.fecha}</span>
            <div className="aq-bar-track">
              <div
                className="aq-bar-fill"
                style={{ width: `${(r.consumo / max) * 100}%` }}
              ></div>
            </div>
            <span className="aq-bar-val">{r.consumo} L</span>
          </div>
        ))}
      </div>
    </div>
  );
}
