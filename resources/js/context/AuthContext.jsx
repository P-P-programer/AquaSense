/**
 * AuthContext.jsx — Estado de autenticación global
 *
 * Provee: user, loading, login(), logout(), isAdmin()
 * Al montar verifica si ya hay sesión activa llamando a /api/me
 */

import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function normalizeUser(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (!payload.id) return null;
  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.me()
      .then((data) => setUser(normalizeUser(data)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password, remember = false) {
    setError(null);
    try {
      await api.login(email, password, remember);
      const userData = await api.me();
      const safeUser = normalizeUser(userData);
      setUser(safeUser);
      return safeUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch (_) {
      //
    }
    setUser(null);
  }

  const isAdmin = () => user?.role === "admin";
  const isUser = () => user?.role === "user";

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isAdmin, isUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de conveniencia
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
