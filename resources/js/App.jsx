import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import WelcomePage from "./components/WelcomePage";
import DashboardPage from "./components/DashboardPage";
import '../css/aquasense.css';

/**
 * Router interno basado en estado de autenticación.
 * No usa react-router — si lo tienes instalado puedes
 * reemplazar esto por <Routes> y <Navigate> según prefieras.
 */
function AppRouter() {
  const { user, loading } = useAuth();

  // Mientras verifica sesión existente (llamada a /api/me al montar)
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1520",
        color: "#5a7a95",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        gap: "0.75rem",
      }}>
        <span className="aq-spinner"></span>
        Iniciando sistema...
      </div>
    );
  }

  // Autenticado → dashboard
  if (user) return <DashboardPage />;

  // No autenticado → welcome + login
  // WelcomePage ya no necesita prop onLogin — LoginPage es independiente
  // Si tu WelcomePage tiene un botón "Acceder", muéstralo aquí con estado local
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}