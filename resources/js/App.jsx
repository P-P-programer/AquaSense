import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import WelcomePage from "./components/WelcomePage";
import DashboardPage from "./components/DashboardPage";
import SurveyApp from "./survey/SurveyApp";
import "../css/aquasense.css";

const SURVEY_PATH = "/encuesta";

function AppRouter() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const surveyEnabled = import.meta.env.VITE_SURVEY_DEBUG_MODE === "true" || window.__SURVEY_DEBUG_MODE__ === true;
  const pathname = window.location.pathname;
  const isSurveyRoute = surveyEnabled && (pathname === "/" || pathname.startsWith(SURVEY_PATH));

  if (isSurveyRoute) {
    return <SurveyApp enabled={true} />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1520",
          color: "#5a7a95",
          fontFamily: "monospace",
          fontSize: "0.85rem",
          gap: "0.75rem",
        }}
      >
        <span className="aq-spinner"></span>
        Iniciando sistema...
      </div>
    );
  }

  if (user?.id) return <DashboardPage />;

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