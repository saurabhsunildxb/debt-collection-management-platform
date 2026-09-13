import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getStoredUser, getToken, setSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getToken());
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    api('/auth/me', { token })
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setSession(token, data.user);
      })
      .catch((err) => {
      if (cancelled) return;

        if (err.status === 401) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(() => {
    const isAgent = user?.role === 'COLLECTION_AGENT';
    const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    async function login(email, password) {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }

    function logout() {
      clearSession();
      setToken(null);
      setUser(null);
    }

    return { user, token, loading, isAgent, canManage, login, logout };
  }, [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
