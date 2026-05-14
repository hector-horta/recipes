import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from './lib/api';
import type { UserProfile } from '@wati/types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.get<UserProfile>('/auth/me');
      if (data.role === 'super_admin') {
        setUser(data);
      } else {
        setUser(null);
        setError('Acceso denegado. Se requiere rol de super_admin.');
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: any) => {
    try {
      setError(null);
      const data = await api.post<{ user: UserProfile }>('/auth/login', credentials);
      if (data.user.role === 'super_admin') {
        setUser(data.user);
        return data.user;
      } else {
        await logout();
        const msg = 'Acceso denegado. Se requiere rol de super_admin.';
        setError(msg);
        throw new Error(msg);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Error al iniciar sesión');
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.get<UserProfile>('/auth/me');
      if (data.role === 'super_admin') {
        setUser(data);
      }
    } catch (err) {
      console.error('Auth refresh failed', err);
    }
  };

  const isAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return context;
};
