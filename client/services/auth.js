import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post("/auth/refresh")
      .then((result) => {
        setAccessToken(result.accessToken);
        setUser(result.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const result = await api.post("/auth/login", credentials);
      setAccessToken(result.accessToken);
      setUser(result.user);
    },
    async register(values) {
      const result = await api.post("/auth/register", values);
      setAccessToken(result.accessToken);
      setUser(result.user);
    },
    async logout() {
      try {
        await api.post("/auth/logout");
      } finally {
        setAccessToken(null);
        setUser(null);
      }
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
