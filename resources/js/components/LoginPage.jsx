import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, remember);
      // El AuthContext actualiza `user` → App.jsx redirige al dashboard automáticamente
    } catch (err) {
      setError(err.message ?? "Credenciales incorrectas o cuenta inactiva.");
    } finally {
      setLoading(false);
    }
  }

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

        {error && (
          <div className="aq-alert-error">
            <i className="bi bi-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Usar form + onSubmit permite submit con Enter */}
        <form onSubmit={handleLogin}>
          <label className="aq-input-label">Correo electrónico</label>
          <input
            className="aq-input"
            type="email"
            placeholder="usuario@entidad.gov"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            minLength={5}
            disabled={loading}
          />

          <label className="aq-input-label" style={{ marginTop: "1rem" }}>Contraseña</label>
          <input
            className="aq-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={8}
            disabled={loading}
          />

          <label className="aq-switch-row" style={{ marginTop: "0.9rem" }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />
            <span>Mantener sesión activa</span>
          </label>

          <button
            type="submit"
            className="aq-btn-primary"
            style={{ width: "100%", marginTop: "1.25rem" }}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <><span className="aq-spinner-sm"></span> Verificando...</>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        <p style={{ fontSize: "0.72rem", color: "var(--texto-secundario)", textAlign: "center", marginTop: "1.2rem" }}>
          <i className="bi bi-shield-lock"></i> Acceso cifrado · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}
