import { useEffect, useState } from "react";
import SurveyHome from "./SurveyHome";
import SurveyRegister from "./SurveyRegister";
import SurveyResults from "./SurveyResults";
import "../../css/survey-debug.css";

const BASE = "/encuesta";

function currentModule() {
  const path = window.location.pathname;

  if (path.startsWith(`${BASE}/registrar`)) return "register";
  if (path.startsWith(`${BASE}/ver`)) return "view";

  return "home";
}

function askGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizacion no disponible en este navegador."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error("No se pudo obtener la ubicacion.")),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

export default function SurveyApp({ enabled }) {
  const [module, setModule] = useState(currentModule());
  const [busyPermissions, setBusyPermissions] = useState(false);
  const [permissions, setPermissions] = useState({
    notifications: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    location: "unknown",
  });
  const [coords, setCoords] = useState(null);

  const appEnabled = enabled || window.location.pathname.startsWith(BASE);

  useEffect(() => {
    const onPop = () => setModule(currentModule());
    window.addEventListener("popstate", onPop);

    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (target) => {
    const map = {
      home: BASE,
      register: `${BASE}/registrar`,
      view: `${BASE}/ver`,
    };

    window.history.pushState({}, "", map[target] || BASE);
    setModule(target);
  };

  const enablePermissions = async () => {
    setBusyPermissions(true);

    let notifications = permissions.notifications;
    let location = permissions.location;

    try {
      if (typeof Notification !== "undefined") {
        notifications = await Notification.requestPermission();
      }

      const position = await askGeolocation();
      setCoords(position);
      location = "granted";
    } catch {
      location = "denied";
    } finally {
      setPermissions({ notifications, location });
      setBusyPermissions(false);
    }
  };

  if (!appEnabled) {
    return (
      <main className="survey-shell">
        <section className="survey-card">
          <h1>Modo encuesta deshabilitado</h1>
          <p>Activa SURVEY_DEBUG_MODE=true para habilitar este modo provisional.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="survey-shell">
      {module === "home" && (
        <SurveyHome
          onGoRegister={() => go("register")}
          onGoView={() => go("view")}
          onEnablePermissions={enablePermissions}
          permissions={permissions}
          busy={busyPermissions}
        />
      )}

      {module === "register" && (
        <SurveyRegister
          onBack={() => go("home")}
          permissions={permissions}
          coords={coords}
        />
      )}

      {module === "view" && <SurveyResults onBack={() => go("home")} />}
    </main>
  );
}
