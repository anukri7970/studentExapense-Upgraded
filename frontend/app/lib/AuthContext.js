'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import api, { getErrorMessage } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadSession = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = window.localStorage.getItem('sew_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
      if (posthog.__loaded) {
        posthog.identify(data.id, { role: data.role, email: data.email });
      }
    } catch {
      window.localStorage.removeItem('sew_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await api.post('/auth/login', { email, password });
        window.localStorage.setItem('sew_token', data.token);
        setUser(data.user);
        posthog.capture('user_logged_in', { role: data.user.role });
        posthog.identify(data.user.id, { role: data.user.role, email: data.user.email });
        router.push(`/dashboard/${data.user.role}`);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getErrorMessage(error) };
      }
    },
    [router]
  );

  const signup = useCallback(
    async (payload) => {
      try {
        const { data } = await api.post('/auth/signup', payload);
        window.localStorage.setItem('sew_token', data.token);
        setUser(data.user);
        posthog.capture('user_signed_up', { role: data.user.role });
        posthog.capture('wallet_connected', { role: data.user.role, method: 'auto_generated' });
        posthog.identify(data.user.id, { role: data.user.role, email: data.user.email });
        router.push(`/dashboard/${data.user.role}`);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: getErrorMessage(error) };
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem('sew_token');
    setUser(null);
    posthog.reset();
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refresh: loadSession }),
    [user, loading, login, signup, logout, loadSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
