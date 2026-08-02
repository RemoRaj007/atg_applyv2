import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { User } from '../types/user.types';
import type { RegisterPayload } from '../types/auth.types';
import { setAccessToken, setSessionExpiredHandler } from '../api/apiClient';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  microsoftLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Silently attempt to restore a session from the httpOnly refresh cookie on load
    authApi
      .refresh()
      .then(({ user, accessToken }) => {
        setAccessToken(accessToken);
        setUser(user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // When a token refresh finally fails, the interceptor has already cleared the
  // access token but cannot clear React state on its own. Without this the app
  // stayed "authenticated" with no usable token, so every request 401'd behind a
  // toast and the user was never told to sign in again.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      const { pathname, search } = window.location;
      const isOnAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].some((p) =>
        pathname.startsWith(p)
      );
      if (!isOnAuthPage) {
        // Carries where they were, so signing back in returns them there rather
        // than dumping them on a dashboard.
        const from = encodeURIComponent(`${pathname}${search}`);
        window.location.assign(`/login?expired=1&from=${from}`);
      }
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = async (email: string, password: string) => {
    const { user, accessToken } = await authApi.login(email, password);
    setAccessToken(accessToken);
    setUser(user);
  };

  const register = async (payload: RegisterPayload) => {
    const { user, accessToken } = await authApi.register(payload);
    setAccessToken(accessToken);
    setUser(user);
  };

  const googleLogin = async (idToken: string) => {
    const { user, accessToken } = await authApi.googleLogin(idToken);
    setAccessToken(accessToken);
    setUser(user);
  };

  const microsoftLogin = async (idToken: string) => {
    const { user, accessToken } = await authApi.microsoftLogin(idToken);
    setAccessToken(accessToken);
    setUser(user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, googleLogin, microsoftLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
