import { useAuth } from "../context/AuthContext";
import AdminPanel from "./AdminPanel";
import AlertsPanel from "./AlertsPanel";
import ChartComponent from "./ChartComponent";
import TableComponent from "./TableComponent";
import StatsComponent from "./StatsComponent";

function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="aq-navbar">
      <div className="aq-navbar-brand">
        <i className="bi bi-droplet-fill"></i>
        AquaSense
        <span className="aq-navbar-badge">v1.0 · IOT</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Rol visible */}
        {isAdmin() && (
          <span style={{ color: "#7dd3fc", fontSize: "0.72rem", fontFamily: "monospace", letterSpacing: "0.06em" }}>
            ADMIN
          </span>
        )}
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem" }}>
          <i className="bi bi-circle-fill" style={{ color: "#10b981", fontSize: "0.5rem", marginRight: 4 }}></i>
          ESP32 conectado
        </span>
        {/* Nombre del usuario */}
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem" }}>
          {user?.name ?? user?.email}
        </span>
        <button
          onClick={logout}
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

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <div className="aq-dashboard">
        <div className="aq-page-title">Panel de monitoreo</div>
        <div className="aq-page-sub">
          Actualización en tiempo real · Sensores: caudal, pH, turbidez, temperatura
        </div>

        <StatsComponent />

        <AlertsPanel />

        {isAdmin() && <AdminPanel />}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <ChartComponent />
          <TableComponent />
        </div>
      </div>
    </>
  );
}
