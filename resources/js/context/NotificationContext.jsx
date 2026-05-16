import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const NotificationContext = createContext(null);

let nextToastId = 1;

function buildToast(input) {
  return {
    id: nextToastId++,
    kind: input.kind ?? "info",
    title: input.title ?? null,
    message: input.message ?? "",
    duration: input.duration ?? null,
    actions: Array.isArray(input.actions) ? input.actions : [],
  };
}

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="aq-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <article key={toast.id} className={`aq-toast aq-toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
          <div className="aq-toast-head">
            <div>
              {toast.title && <strong className="aq-toast-title">{toast.title}</strong>}
              <div className="aq-toast-message">{toast.message}</div>
            </div>
            <button type="button" className="aq-toast-close" onClick={() => onDismiss(toast.id)} aria-label="Cerrar notificación">
              ×
            </button>
          </div>

          {toast.actions.length > 0 && (
            <div className="aq-toast-actions">
              {toast.actions.map((action) => (
                <button
                  key={`${toast.id}-${action.label}`}
                  type="button"
                  className={`aq-btn-secondary aq-toast-action ${action.variant ? `is-${action.variant}` : ""}`}
                  onClick={() => action.onClick?.()}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));

    const timer = timersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  const push = useCallback((input) => {
    const toast = buildToast(input);
    setToasts((current) => [...current, toast].slice(-4));

    const autoCloseMs = toast.duration ?? (toast.kind === "error" ? 6500 : 4200);
    if (autoCloseMs > 0) {
      const timer = window.setTimeout(() => dismiss(toast.id), autoCloseMs);
      timersRef.current.set(toast.id, timer);
    }

    return toast.id;
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    dismiss,
    success: (message, options = {}) => push({ ...options, kind: "success", message }),
    error: (message, options = {}) => push({ ...options, kind: "error", message }),
    warning: (message, options = {}) => push({ ...options, kind: "warning", message }),
    info: (message, options = {}) => push({ ...options, kind: "info", message }),
  }), [dismiss, push]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);

  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de <NotificationProvider>");
  }

  return ctx;
}