import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from './lib/api';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  diet?: string;
  intolerances?: string[];
  excluded_ingredients?: string;
  daily_calories?: number;
  onboarding_completed: boolean;
  language: string;
  is_verified: boolean;
  severities?: Record<string, string>;
  conditions?: string[];
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<UserProfile>;
  register: (data: any) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.get<UserProfile>('/auth/me');
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any) => {
    try {
      setError(null);
      const data = await api.post<{ user: UserProfile }>('/auth/login', credentials);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al iniciar sesión';
      setError(msg);
      throw err;
    }
  };

  const register = async (data: any) => {
    try {
      setError(null);
      const response = await api.post<{ user: UserProfile }>('/auth/register', data);
      setUser(response.user);
      return response.user;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al registrarse';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setError(null);
      const updatedProfile = await api.put<UserProfile>('/auth/profile', updates);
      if (user) {
        setUser({ ...user, ...updatedProfile });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al actualizar perfil';
      setError(msg);
      throw err;
    }
  };

  const resendVerification = async () => {
    try {
      await api.post('/auth/resend-verification');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al reenviar verificación';
      setError(msg);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateProfile, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
