import ChartComponent from "./ChartComponent";
import TableComponent from "./TableComponent";
import StatsComponent from "./StatsComponent";

function Navbar({ onLogout }) {
  return (
    <nav className="aq-navbar">
      <div className="aq-navbar-brand">
        <i className="bi bi-droplet-fill"></i>
        AquaSense
        <span className="aq-navbar-badge">v1.0 · IOT</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem" }}>
          <i className="bi bi-circle-fill" style={{ color: "#10b981", fontSize: "0.5rem", marginRight: 4 }}></i>
          ESP32 conectado
        </span>
        <button
          onClick={onLogout}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.75)",
            borderRadius: 6,
            padding: "4px 14px",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          <i className="bi bi-box-arrow-right"></i> Salir
        </button>
      </div>
    </nav>
  );
}

export default function DashboardPage({ onLogout }) {
  return (
    <>
      <Navbar onLogout={onLogout} />
      <div className="aq-dashboard">
        <div className="aq-page-title">Panel de monitoreo</div>
        <div className="aq-page-sub">
          Actualización en tiempo real · Sensores: caudal, pH, turbidez, temperatura
        </div>

        <StatsComponent />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <ChartComponent />
          <TableComponent />
        </div>
      </div>
    </>
  );
}
