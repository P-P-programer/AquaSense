import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AlertPreferencesPanel() {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    alerts_notify_email: true,
    alerts_notify_push: true,
    alerts_min_severity: "media",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [okMessage, setOkMessage] = useState("");

  useEffect(() => {
    api.getMyAlertPreferences()
      .then((data) => setForm(data))
      .catch((err) => setError(err.message ?? "No se pudieron cargar tus preferencias."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOkMessage("");

    try {
      const response = await api.updateMyAlertPreferences(form);
      setForm(response.preferences);
      setOkMessage("Preferencias guardadas.");
    } catch (err) {
      setError(err.message ?? "No se pudieron guardar las preferencias.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="aq-panel">
        <div className="aq-loading">
          <div className="aq-spinner"></div>
          Cargando preferencias de alertas...
        </div>
      </div>
    );
  }

  return (
    <div className="aq-panel">
      <div className="aq-panel-title">
        <i className="bi bi-sliders"></i>
        Preferencias de alerta
      </div>

      {error && <div className="aq-alert-error"><i className="bi bi-exclamation-triangle"></i> {error}</div>}
      {okMessage && <div className="aq-loading">{okMessage}</div>}

      <form onSubmit={submit} className="aq-admin-form">
        {isAdmin() && (
          <div className="aq-alert-warning" style={{ marginBottom: "0.75rem" }}>
            <i className="bi bi-shield-lock"></i> En cuentas admin, el correo para alertas críticas es obligatorio.
          </div>
        )}

        <label className="aq-switch-row">
          <input
            type="checkbox"
            checked={form.alerts_notify_email}
            disabled={isAdmin()}
            onChange={(e) => setForm((cur) => ({ ...cur, alerts_notify_email: e.target.checked }))}
          />
          <span>{isAdmin() ? "Recibir alertas por correo (siempre activo en admin)" : "Recibir alertas por correo"}</span>
        </label>

        <label className="aq-switch-row">
          <input
            type="checkbox"
            checked={form.alerts_notify_push}
            onChange={(e) => setForm((cur) => ({ ...cur, alerts_notify_push: e.target.checked }))}
          />
          <span>Recibir alertas por push</span>
        </label>

        <div>
          <label className="aq-input-label">Severidad mínima a notificar</label>
          <select
            className="aq-input"
            value={form.alerts_min_severity}
            onChange={(e) => setForm((cur) => ({ ...cur, alerts_min_severity: e.target.value }))}
          >
            <option value="leve">Leve</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        <div className="aq-admin-actions">
          <button type="submit" className="aq-btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar preferencias"}
          </button>
        </div>
      </form>
    </div>
  );
}
