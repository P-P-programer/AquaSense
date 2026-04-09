import { useMemo, useState } from "react";
import api from "../services/api";
import { EDUCATION_LEVELS, TOLIMA_CITIES } from "./constants";

export default function SurveyRegister({ permissions, coords, onBack }) {
  const [cityQuery, setCityQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [form, setForm] = useState({
    full_name: "",
    document_id: "",
    selected_city: "",
    education_level: "",
  });

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return TOLIMA_CITIES;
    return TOLIMA_CITIES.filter((city) => city.toLowerCase().includes(q));
  }, [cityQuery]);

  const canSubmit =
    permissions.notifications === "granted" &&
    permissions.location === "granted" &&
    Number.isFinite(coords?.latitude) &&
    Number.isFinite(coords?.longitude);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatus({
        type: "error",
        message: "Debes activar notificaciones y ubicacion antes de enviar.",
      });
      return;
    }

    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await api.createSurveyResponse({
        ...form,
        latitude: coords.latitude,
        longitude: coords.longitude,
        notifications_enabled: true,
      });

      setStatus({ type: "ok", message: "Encuesta enviada correctamente." });
      setForm({
        full_name: "",
        document_id: "",
        selected_city: "",
        education_level: "",
      });
      setCityQuery("");
    } catch (error) {
      setStatus({ type: "error", message: error.message || "No se pudo guardar la encuesta." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="survey-card">
      <div className="survey-header-row">
        <h2>Registrar encuesta</h2>
        <button className="survey-btn survey-btn-ghost" onClick={onBack} type="button">
          Volver
        </button>
      </div>

      <form className="survey-form" onSubmit={submit}>
        <label>
          Nombre completo
          <input
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            required
            maxLength={150}
          />
        </label>

        <label>
          Documento del encuestado
          <input
            value={form.document_id}
            onChange={(e) => updateField("document_id", e.target.value)}
            required
            maxLength={40}
          />
        </label>

        <label>
          Buscar ciudad del Tolima
          <input
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            placeholder="Escribe para filtrar ciudades"
          />
        </label>

        <label>
          Ciudad seleccionada
          <select
            value={form.selected_city}
            onChange={(e) => updateField("selected_city", e.target.value)}
            required
          >
            <option value="">Selecciona una ciudad</option>
            {filteredCities.map((city) => (
              <option value={city} key={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nivel de educacion
          <select
            value={form.education_level}
            onChange={(e) => updateField("education_level", e.target.value)}
            required
          >
            <option value="">Selecciona nivel</option>
            {EDUCATION_LEVELS.map((level) => (
              <option value={level.value} key={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <div className="survey-location-box">
          <strong>Ubicacion capturada</strong>
          <div>
            {Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)
              ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
              : "Sin ubicacion disponible"}
          </div>
        </div>

        {!canSubmit && (
          <p className="survey-note">Activa notificaciones y ubicacion para habilitar el envio.</p>
        )}

        <button className="survey-btn survey-btn-primary" type="submit" disabled={saving || !canSubmit}>
          {saving ? "Guardando..." : "Enviar encuesta"}
        </button>

        {status.message && (
          <p className={status.type === "ok" ? "survey-msg-ok" : "survey-msg-error"}>{status.message}</p>
        )}
      </form>
    </section>
  );
}
