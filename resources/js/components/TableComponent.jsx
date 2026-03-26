import { useEffect, useState } from "react";

const MOCK_DATA = [
  { fecha: "25 Jun 2025", consumo: 415, ph: 7.2, turbidez: 0.8, estado: "ok" },
  { fecha: "24 Jun 2025", consumo: 398, ph: 7.4, turbidez: 1.1, estado: "ok" },
  { fecha: "23 Jun 2025", consumo: 445, ph: 6.8, turbidez: 2.4, estado: "warn" },
  { fecha: "22 Jun 2025", consumo: 510, ph: 7.0, turbidez: 0.9, estado: "ok" },
  { fecha: "21 Jun 2025", consumo: 390, ph: 8.1, turbidez: 4.2, estado: "warn" },
  { fecha: "20 Jun 2025", consumo: 420, ph: 7.3, turbidez: 0.7, estado: "ok" },
];

const estadoLabel = { ok: "Normal", warn: "Alerta", danger: "Crítico" };

export default function TableComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // fetch("/api/registros").then(r => r.json()).then(setData);
    setTimeout(() => setData(MOCK_DATA), 500);
  }, []);

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
              <td>{r.ph}</td>
              <td>{r.turbidez} NTU</td>
              <td>
                <span className={`aq-badge ${r.estado}`}>
                  {estadoLabel[r.estado]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
