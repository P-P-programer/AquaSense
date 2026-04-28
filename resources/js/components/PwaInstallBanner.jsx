import { useEffect, useMemo, useState } from "react";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;

  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true,
  );
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(true);
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa());
  const [installing, setInstalling] = useState(false);
  const [manualHint, setManualHint] = useState("");

  const canInstall = useMemo(() => Boolean(installEvent), [installEvent]);

  useEffect(() => {
    if (isStandalonePwa()) {
      setIsInstalled(true);
      setVisible(false);
      return;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setVisible(false);
      setInstallEvent(null);
      setInstalling(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) {
      const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      setManualHint(
        isIos
          ? "En iPhone/iPad: abre Compartir y pulsa 'Agregar a pantalla de inicio'."
          : "Tu navegador aún no habilita el instalador. Recarga la página y vuelve a intentar.",
      );
      return;
    }

    try {
      setInstalling(true);
      setManualHint("");
      installEvent.prompt();
      await installEvent.userChoice;
      setVisible(false);
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  }

  if (!visible || isInstalled) {
    return null;
  }

  return (
    <aside className="aq-pwa-banner" role="status" aria-live="polite">
      <div className="aq-pwa-banner-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm0 18H7V5h10v14Zm-5 3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM9 3h6v1H9V3Z" />
        </svg>
      </div>

      <div className="aq-pwa-banner-body">
        <div className="aq-pwa-banner-title">Instala AquaSense en tu dispositivo</div>
        <p>
          Tendrás acceso más rápido, pantalla completa y mejor experiencia al volver a entrar.
        </p>
      </div>

      <div className="aq-pwa-banner-actions">
        <button type="button" className="aq-btn-secondary aq-pwa-banner-close" onClick={() => setVisible(false)}>
          Cerrar
        </button>
        <button
          type="button"
          className="aq-btn-primary aq-pwa-banner-install"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? "Abriendo instalador..." : "Instalar ahora"}
        </button>
      </div>

      {manualHint && <div className="aq-pwa-banner-hint">{manualHint}</div>}
    </aside>
  );
}