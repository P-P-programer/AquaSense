import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function LoginPage() {
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setResendMessage("");
    setLoading(true);

    try {
      await login(email, password, remember);
      // El AuthContext actualiza `user` → App.jsx redirige al dashboard automáticamente
    } catch (err) {
      if (err?.status === 403 && err?.data?.code === "email_not_verified") {
        setPendingEmail(err?.data?.email || email);
      } else {
        setError(err.message ?? "Credenciales incorrectas o cuenta inactiva.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!pendingEmail) return;

    setError(null);
    setResendMessage("");
    setResendLoading(true);

    try {
      const response = await api.resendVerificationEmail(pendingEmail);
      setResendMessage(response?.message ?? "Correo reenviado.");
    } catch (err) {
      setError(err.message ?? "No se pudo reenviar el correo de verificación.");
    } finally {
      setResendLoading(false);
    }
  }

  if (pendingEmail) {
    return (
      <div className="aq-login">
        <div className="aq-login-card">
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="bi bi-envelope-check-fill" style={{ color: "var(--azul-agua)", fontSize: "1.6rem" }}></i>
            <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--azul-profundo)", letterSpacing: "0.04em" }}>
              Revisa tu correo
            </span>
          </div>

          <p className="aq-login-sub" style={{ marginBottom: "1rem" }}>
            Tu cuenta está pendiente de verificación. Te enviamos un enlace firmado a:
            <br />
            <strong>{pendingEmail}</strong>
          </p>

          {error && (
            <div className="aq-alert-error">
              <i className="bi bi-exclamation-circle"></i> {error}
            </div>
          )}

          {resendMessage && (
            <div className="aq-alert-success">
              <i className="bi bi-check-circle"></i> {resendMessage}
            </div>
          )}

          <button
            type="button"
            className="aq-btn-primary"
            style={{ width: "100%" }}
            onClick={handleResendVerification}
            disabled={resendLoading}
          >
            {resendLoading ? "Reenviando..." : "Reenviar correo de verificación"}
          </button>

          <button
            type="button"
            className="aq-btn-secondary"
            style={{ width: "100%", marginTop: "0.75rem" }}
            onClick={() => {
              setPendingEmail("");
              setResendMessage("");
              setError(null);
            }}
          >
            Volver al login
          </button>

          <p style={{ fontSize: "0.72rem", color: "var(--texto-secundario)", textAlign: "center", marginTop: "1.2rem" }}>
            Una vez verifiques el correo, un administrador debe activar tu cuenta para habilitar el acceso.
          </p>
        </div>
      </div>
    );
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
