import React, { useState, useEffect } from "react";
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';

// ... todos tus componentes igual ...

export default function App() {
  const [page, setPage] = useState("welcome");

  if (page === "welcome") return <WelcomePage onLogin={() => setPage("login")} />;
  if (page === "login") return <LoginPage onEnter={() => setPage("dashboard")} />;
  return <DashboardPage />;
}
// ❌ Quita las últimas 2 líneas de createRoot de aquí