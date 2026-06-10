import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  AUTH_EXPIRED_EVENT,
  clearStoredToken,
  getStoredToken
} from "../api/client";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setInitializing(false);
        return;
      }
      try {
        const response = await getCurrentUser();
        if (!cancelled) setUser(response.data);
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    function handleAuthExpired() {
      setToken(null);
      setUser(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  async function login(email, password) {
    const response = await loginUser(email, password);
    setToken(response.data.access_token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function register(payload) {
    await registerUser(payload);
    return login(payload.email, payload.password);
  }

  function logout() {
    logoutUser();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, initializing, login, register, logout, isAuthenticated: Boolean(token) }),
    [token, user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
