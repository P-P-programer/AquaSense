export default function SurveyHome({ onGoRegister, onGoView, onEnablePermissions, permissions, busy }) {
  const allReady = permissions.notifications === "granted" && permissions.location === "granted";

  return (
    <section className="survey-card">
      <h1>Modo Encuesta U</h1>
      <p>
        Este modo provisional permite registrar encuestas con ubicacion y luego visualizar resultados en mapa y tabla.
      </p>

      <div className="survey-permissions">
        <button className="survey-btn survey-btn-primary" onClick={onEnablePermissions} disabled={busy}>
          {busy ? "Activando permisos..." : "Activar notificaciones y ubicacion"}
        </button>
        <div className="survey-permission-status">
          <span className={permissions.notifications === "granted" ? "ok" : "warn"}>
            Notificaciones: {permissions.notifications}
          </span>
          <span className={permissions.location === "granted" ? "ok" : "warn"}>
            Ubicacion: {permissions.location}
          </span>
        </div>
      </div>

      <div className="survey-grid-actions">
        <button className="survey-btn" onClick={onGoRegister}>
          Registrar encuesta
        </button>
        <button className="survey-btn" onClick={onGoView}>
          Ver resultados
        </button>
      </div>

      {!allReady && (
        <p className="survey-note">
          Debes conceder ambos permisos para poder enviar el formulario.
        </p>
      )}
    </section>
  );
}
