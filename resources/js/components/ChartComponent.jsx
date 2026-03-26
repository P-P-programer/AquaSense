import { useEffect, useState } from "react";

export default function ChartComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/registros")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data.length) return <div>Cargando gráfica...</div>;

  // Aquí puedes usar una librería como Chart.js, pero para ejemplo:
  return (
    <div>
      <h5>Consumo diario (gráfico simple)</h5>
      <ul>
        {data.map((r, i) => (
          <li key={i}>{r.fecha}: {r.consumo} L</li>
        ))}
      </ul>
    </div>
  );
}