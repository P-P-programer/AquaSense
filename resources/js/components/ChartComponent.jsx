import { useEffect, useState } from "react";

const MOCK_DATA = [
  { fecha: "19 Jun", consumo: 380 },
  { fecha: "20 Jun", consumo: 420 },
  { fecha: "21 Jun", consumo: 390 },
  { fecha: "22 Jun", consumo: 510 },
  { fecha: "23 Jun", consumo: 445 },
  { fecha: "24 Jun", consumo: 398 },
  { fecha: "25 Jun", consumo: 415 },
];

export default function ChartComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // fetch("/api/registros").then(r => r.json()).then(setData);
    setTimeout(() => setData(MOCK_DATA), 700);
  }, []);

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
