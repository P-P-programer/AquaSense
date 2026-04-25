import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AdminPanel from "./AdminPanel";
import AlertsPanel from "./AlertsPanel";
import AlertPreferencesPanel from "./AlertPreferencesPanel";
import ChartComponent from "./ChartComponent";
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

export default function DashboardPage() {
  const { user, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState(null);
  const [outboxState, setOutboxState] = useState(() => getOutboxSnapshot());
  const notifyRef = useRef(null);

  const sections = useMemo(() => {
    const baseSections = [
      { id: "overview", icon: "bi-speedometer2", label: "Resumen" },
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
    return subscribeOutboxStatus((snapshot) => {
      setOutboxState(snapshot);
    });
  }, []);

  const criticalCount = alerts.filter((alert) => alert.severity === "critica").length;
  const currentMeta = SECTION_META[activeSection] ?? SECTION_META.overview;

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

            <div className="aq-status-pill">
              <i className="bi bi-circle-fill"></i>
              ESP32 en línea
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
              <StatsComponent />
              <div className="aq-overview-grid">
                <ChartComponent />
                <TableComponent />
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
