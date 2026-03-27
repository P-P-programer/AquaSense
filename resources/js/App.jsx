import { useState } from "react";
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import '../css/aquasense.css'; 

export default function App() {
  const [page, setPage] = useState("welcome");

  if (page === "welcome") return <WelcomePage onLogin={() => setPage("login")} />;
  if (page === "login")   return <LoginPage onEnter={() => setPage("dashboard")} />;
  return <DashboardPage onLogout={() => setPage("welcome")} />;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
}
