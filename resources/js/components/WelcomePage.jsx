export default function WelcomePage({ onLogin }) {
  return (
    <div className="aq-welcome">
      <div className="aq-welcome-logo">
        Aqua<span>Sense</span>
      </div>
      <p className="aq-welcome-sub">
        Sistema gubernamental de monitoreo IoT para calidad y consumo de agua.
      </p>

      <div className="aq-welcome-icons">
        <div className="aq-icon-card">
          <i className="bi bi-droplet-fill" style={{ color: "#0ea5e9" }}></i>
          <span>Caudal</span>
        </div>
        <div className="aq-icon-card">
          <i className="bi bi-activity" style={{ color: "#10b981" }}></i>
          <span>pH</span>
        </div>
        <div className="aq-icon-card">
          <i className="bi bi-exclamation-triangle-fill" style={{ color: "#f59e0b" }}></i>
          <span>Residuos</span>
        </div>
        <div className="aq-icon-card">
          <i className="bi bi-cpu-fill" style={{ color: "#a78bfa" }}></i>
          <span>ESP32</span>
        </div>
      </div>

      <button className="aq-btn-primary" onClick={onLogin}>
        Acceder al sistema
      </button>
    </div>
  );
}
