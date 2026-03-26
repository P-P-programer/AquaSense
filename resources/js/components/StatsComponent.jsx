import { useEffect, useState } from "react";

export default function StatsComponent() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Cargando estadísticas...</div>;

  return (
    <div className="mb-4">
      <div>Total consumo: {stats.total_consumo} L</div>
      <div>Promedio diario: {stats.promedio_diario} L</div>
      <div>Alertas: {stats.alertas}</div>
    </div>
  );
}