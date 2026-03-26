import { useState } from "react";

export default function LoginPage({ onEnter }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="aq-login">
      <div className="aq-login-card">
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10 }}>
          <i className="bi bi-droplet-fill" style={{ color: "var(--azul-agua)", fontSize: "1.6rem" }}></i>
          <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--azul-profundo)", letterSpacing: "0.04em" }}>
            AquaSense
          </span>
        </div>

        <div className="aq-login-title">Iniciar sesión</div>
        <p className="aq-login-sub">Sistema de monitoreo de agua — acceso restringido</p>

        <label className="aq-input-label">Usuario</label>
        <input
          className="aq-input"
          type="text"
          placeholder="usuario@entidad.gov"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
        />

        <label className="aq-input-label">Contraseña</label>
        <input
          className="aq-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          className="aq-btn-primary"
          style={{ width: "100%", marginTop: "0.5rem" }}
          onClick={onEnter}
        >
          Ingresar
        </button>

        <p style={{ fontSize: "0.72rem", color: "var(--texto-secundario)", textAlign: "center", marginTop: "1.2rem" }}>
          <i className="bi bi-shield-lock"></i> Acceso cifrado · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}
