import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AdminPanel from "./AdminPanel";
import AlertsPanel from "./AlertsPanel";
import AlertPreferencesPanel from "./AlertPreferencesPanel";
import ChartComponent from "./ChartComponent";
import PwaInstallBanner from "./PwaInstallBanner";
import ReportesPanel from "./ReportesPanel";
import ReportHistoryPanel from "./ReportHistoryPanel";
import TableComponent from "./TableComponent";
import StatsComponent from "./StatsComponent";
import api from "../services/api";
import { getOutboxSnapshot, subscribeOutboxStatus } from "../services/outbox";

const SECTION_META = {
  overview: {
    icon: "bi-speedometer2",
    title: "Resumen operativo",
    subtitle: "Estado general de sensores, tendencia de pH y registros más recientes.",
  },
  reportes: {
    icon: "bi-file-earmark-bar-graph",
    title: "Reportes",
    subtitle: "Métricas semanales, filtros de consulta y exportaciones del sistema.",
  },
  alerts: {
    icon: "bi-bell",
    title: "Alertas y preferencias",
    subtitle: "Monitorea eventos críticos y ajusta notificaciones por severidad.",
  },
  admin: {
    icon: "bi-sliders2",
    title: "Administración",
    subtitle: "Gestión de usuarios, dispositivos, zonas y tokens de acceso.",
  },
};

function NotificationDropdown({
  open,
  loading,
  alerts,
  onRefresh,
  onResolve,
  onClose,
  resolvingId,
}) {
  if (!open) return null;

  return (
    <div className="aq-notify-menu" role="menu" aria-label="Notificaciones">
      <div className="aq-notify-head">
        <strong>Alertas activas</strong>
        <button type="button" className="aq-link-button" onClick={onRefresh}>
          Refrescar
        </button>
      </div>

      {loading && <div className="aq-table-meta">Cargando alertas...</div>}

      {!loading && alerts.length === 0 && (
        <div className="aq-empty-state" style={{ marginTop: "0.35rem" }}>
          No hay alertas activas por ahora.
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="aq-notify-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="aq-notify-item">
              <div className="aq-notify-item-top">
                <strong>{alert.title}</strong>
                <span className={`aq-badge aq-severity-${alert.severity}`}>{alert.severity}</span>
              </div>
              <div className="aq-table-meta">{alert.message}</div>
              <div className="aq-table-meta">{alert.device?.name ?? "Dispositivo"} · {alert.device?.city?.name ?? "Sin ciudad"}</div>
              <button
                type="button"
                className="aq-link-button"
                disabled={resolvingId === alert.id}
                onClick={() => onResolve(alert.id)}
              >
                {resolvingId === alert.id ? "Resolviendo..." : "Marcar resuelta"}
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="aq-btn-secondary" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}

function isDeviceOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs <= 60000;
}

function getEsp32Status(devices) {
  const total = Array.isArray(devices) ? devices.length : 0;
  const online = Array.isArray(devices) ? devices.filter((device) => isDeviceOnline(device?.last_seen_at)).length : 0;

  if (total === 0) {
    return {
      label: "Sin ESP32 asignados",
      detail: "No hay dispositivos vinculados a esta sesión.",
      tone: "neutral",
      title: "No hay ESP32 asignados a este usuario",
    };
  }

  if (total === 1) {
    return online === 1
      ? {
          label: "ESP32 en línea",
          detail: "1/1 dispositivo online",
          tone: "success",
          title: "El único ESP32 del usuario está en línea",
        }
      : {
          label: "ESP32 sin señal",
          detail: "1/1 dispositivo offline",
          tone: "danger",
          title: "El único ESP32 del usuario no reporta datos",
        };
  }

  if (online === total) {
    return {
      label: "Todos en línea",
      detail: `${online}/${total} dispositivos online`,
      tone: "success",
      title: "Todos los ESP32 del usuario están en línea",
    };
  }

  if (online === 0) {
    return {
      label: "Ninguno en línea",
      detail: `${online}/${total} dispositivos online`,
      tone: "danger",
      title: "Ningún ESP32 del usuario reporta datos",
    };
  }

  return {
    label: "No todos en línea",
    detail: `${online}/${total} dispositivos online`,
    tone: "warning",
    title: "Solo parte de los ESP32 del usuario está en línea",
  };
}

export default function DashboardPage() {
  const { user, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [outboxState, setOutboxState] = useState(() => getOutboxSnapshot());
  const [sessionDevices, setSessionDevices] = useState(() => user?.devices ?? []);
  const notifyRef = useRef(null);

  const sections = useMemo(() => {
    const baseSections = [
      { id: "overview", icon: "bi-speedometer2", label: "Resumen" },
      { id: "reportes", icon: "bi-file-earmark-bar-graph", label: "Reportes" },
      { id: "alerts", icon: "bi-bell", label: "Alertas" },
    ];

    if (isAdmin()) {
      baseSections.push({ id: "admin", icon: "bi-sliders2", label: "Admin" });
    }

    return baseSections;
  }, [isAdmin]);

  async function loadHeaderAlerts() {
    setLoadingAlerts(true);

    try {
      const data = await api.getAlerts({ status: "active", limit: 8 });
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }

  async function resolveFromHeader(alertId) {
    setResolvingAlertId(alertId);

    try {
      await api.resolveAlert(alertId);
      await loadHeaderAlerts();
    } finally {
      setResolvingAlertId(null);
    }
  }

  useEffect(() => {
    loadHeaderAlerts();

    const intervalId = setInterval(() => {
      loadHeaderAlerts();
    }, 20000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleServiceWorkerMessage = (event) => {
      if (event?.data?.type !== 'AQUASENSE_PUSH_RECEIVED') {
        return;
      }

      loadHeaderAlerts();
      window.dispatchEvent(new CustomEvent('aquasense:alerts-refresh', {
        detail: event.data.payload ?? null,
      }));
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin() && activeSection === "admin") {
      setActiveSection("overview");
    }
  }, [isAdmin, activeSection]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!notifyOpen) return;
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setNotifyOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notifyOpen]);

  useEffect(() => {
    setSessionDevices(Array.isArray(user?.devices) ? user.devices : []);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function refreshSessionDevices() {
      if (!user?.id) return;

      try {
        const me = await api.me();
        if (!cancelled) {
          setSessionDevices(Array.isArray(me?.devices) ? me.devices : []);
        }
      } catch {
        // Mantener el último estado conocido si no se puede refrescar.
      }
    }

    refreshSessionDevices();

    const intervalId = setInterval(refreshSessionDevices, 30000);
    const handleFocus = () => refreshSessionDevices();

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    return subscribeOutboxStatus((snapshot) => {
      setOutboxState(snapshot);
    });
  }, []);

  const criticalCount = alerts.filter((alert) => alert.severity === "critica").length;
  const currentMeta = SECTION_META[activeSection] ?? SECTION_META.overview;
  const esp32Status = getEsp32Status(sessionDevices);

  const outboxLabel = (() => {
    if (!outboxState.online) {
      return `Offline · pendientes ${outboxState.pending}`;
    }

    if (outboxState.syncing > 0) {
      return `Sincronizando ${outboxState.syncing}`;
    }

    if (outboxState.pending > 0) {
      return `Pendientes ${outboxState.pending}`;
    }

    if (outboxState.error > 0) {
      return `Errores sync ${outboxState.error}`;
    }

    return "Sincronizado";
  })();

  async function handleLogout() {
    const confirmed = window.confirm("¿Seguro que deseas cerrar sesión?");
    if (!confirmed) return;
    await logout();
  }

  return (
    <div className="aq-shell">
      <aside className={`aq-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="aq-sidebar-brand">
          <i className="bi bi-droplet-fill"></i>
          <div>
            <strong>AquaSense</strong>
            <span>v2.5 shell</span>
          </div>
        </div>

        <nav className="aq-sidebar-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`aq-nav-link ${activeSection === section.id ? "is-active" : ""}`}
              onClick={() => {
                setActiveSection(section.id);
                setSidebarOpen(false);
              }}
            >
              <i className={`bi ${section.icon}`}></i>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="aq-sidebar-foot">
          <div className="aq-sidebar-user">{user?.name ?? user?.email}</div>
          <div className="aq-table-meta">{isAdmin() ? "Rol: admin" : "Rol: usuario"}</div>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="aq-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú lateral" />}

      <div className="aq-main-shell">
        <header className="aq-topbar-shell">
          <div className="aq-topbar-left">
            <button type="button" className="aq-topbar-icon aq-topbar-icon-hint aq-menu-trigger" onClick={() => setSidebarOpen((prev) => !prev)} aria-label="Abrir navegación">
              <i className="bi bi-list"></i>
              <span className="aq-topbar-icon-label">Menú</span>
            </button>
            <div>
              <div className="aq-page-title aq-page-title-icon">
                <i className={`bi ${currentMeta.icon ?? "bi-grid"}`}></i>
                {currentMeta.title}
              </div>
              <div className="aq-page-sub">{currentMeta.subtitle}</div>
            </div>
          </div>

          <div className="aq-topbar-right" ref={notifyRef}>
            <div className="aq-status-pill" title="Estado de sincronización offline">
              <i className="bi bi-arrow-repeat"></i>
              {outboxLabel}
            </div>

            <div className={`aq-status-pill aq-status-pill-${esp32Status.tone}`} title={esp32Status.title}>
              <i className="bi bi-circle-fill"></i>
              {esp32Status.label}
              <span className="aq-status-pill-detail">{esp32Status.detail}</span>
            </div>

            <button type="button" className="aq-topbar-icon aq-topbar-icon-hint aq-notify-trigger" onClick={() => setNotifyOpen((prev) => !prev)} aria-label="Notificaciones">
              <svg className="aq-notify-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3a6 6 0 0 0-6 6v3.4L4.3 15a1 1 0 0 0 .7 1.7h14a1 1 0 0 0 .7-1.7L18 12.4V9a6 6 0 0 0-6-6Zm0 19a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />
              </svg>
              <span className="aq-topbar-icon-label">Notificaciones</span>
              <span className={`aq-notify-badge ${criticalCount > 0 ? "is-critical" : ""}`}>{alerts.length}</span>
            </button>

            <NotificationDropdown
              open={notifyOpen}
              loading={loadingAlerts}
              alerts={alerts}
              onRefresh={loadHeaderAlerts}
              onResolve={resolveFromHeader}
              onClose={() => setNotifyOpen(false)}
              resolvingId={resolvingAlertId}
            />

            <button type="button" className="aq-btn-secondary" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Salir
            </button>
          </div>
        </header>

        <main className="aq-content-shell">
          {activeSection === "overview" && (
            <section className="aq-section-view">
              <PwaInstallBanner />
              <StatsComponent />
              <div className="aq-overview-grid">
                <ChartComponent />
                <TableComponent />
              </div>
            </section>
          )}

          {activeSection === "reportes" && (
            <section className="aq-section-view">
              <ReportesPanel />
              <div style={{ marginTop: "1.5rem" }}>
                <ReportHistoryPanel isAdmin={isAdmin()} />
              </div>
            </section>
          )}

          {activeSection === "alerts" && (
            <section className="aq-section-view">
              <AlertPreferencesPanel />
              <AlertsPanel />
            </section>
          )}

          {activeSection === "admin" && isAdmin() && (
            <section className="aq-section-view">
              <AdminPanel />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
