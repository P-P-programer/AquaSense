import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import WelcomePage from "./components/WelcomePage";
import DashboardPage from "./components/DashboardPage";
import '../css/aquasense.css';

function AppRouter() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

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

  if (user) return <DashboardPage />;

  // Si no está autenticado, primero muestra WelcomePage, luego LoginPage si el usuario lo pide
  if (!showLogin) {
    return <WelcomePage onLogin={() => setShowLogin(true)} />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}