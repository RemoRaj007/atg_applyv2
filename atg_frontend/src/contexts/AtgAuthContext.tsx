import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { User } from '../types/user.types';
import type { RegisterPayload } from '../types/auth.types';
import { setAccessToken } from '../api/apiClient';

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
