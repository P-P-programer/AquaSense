import { useEffect, useState } from "react";

export default function TableComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/registros")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data.length) return <div>Cargando tabla...</div>;

  return (
    <div>
      <h5>Registros históricos</h5>
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Consumo (L)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td>{r.fecha}</td>
              <td>{r.consumo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}