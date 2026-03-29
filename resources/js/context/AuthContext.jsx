/**
 * AuthContext.jsx — Estado de autenticación global
 *
 * Provee: user, loading, login(), logout(), isAdmin()
 * Al montar verifica si ya hay sesión activa llamando a /api/me
 */

import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true mientras verifica sesión inicial
  const [error, setError]     = useState(null);

  // Verificar sesión existente al cargar la app
  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    setError(null);
    try {
      await api.login(email, password);
      const userData = await api.me();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch (_) {
      // Si falla el logout en el servidor, limpiamos igual el estado local
    }
    setUser(null);
  }

  const isAdmin = () => user?.role === "admin";
  const isUser  = () => user?.role === "user";

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
