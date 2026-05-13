import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from './lib/api';
import { logger } from './utils/logger';

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
  severities?: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  conditions?: string[];
  is_verified: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<UserProfile>;
  register: (data: any) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  is_verified: boolean;
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
    const token = localStorage.getItem('wati_jwt');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<UserProfile>('/auth/me');
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: any) => {
    try {
      setError(null);
      logger.info('AUTH_LOGIN_ATTEMPT', { email: credentials.email });
      const data = await api.post<{ user: UserProfile, token?: string }>('/auth/login', credentials);
      setUser(data.user);
      if (data.token) {
        localStorage.setItem('wati_jwt', data.token);
      }
      logger.info('AUTH_LOGIN_SUCCESS', { userId: data.user.id });
      return data.user;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al iniciar sesión';
      logger.error('AUTH_LOGIN_FAILED', err, { credentials });
      setError(msg);
      throw err;
    }
  };

  const register = async (data: any) => {
    try {
      setError(null);
      logger.info('AUTH_REGISTRATION_ATTEMPT', { email: data.email });
      const response = await api.post<{ user: UserProfile, token?: string }>('/auth/register', data);
      setUser(response.user);
      if (response.token) {
        localStorage.setItem('wati_jwt', response.token);
      }
      logger.info('AUTH_REGISTRATION_SUCCESS', { userId: response.user.id });
      return response.user;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al registrarse';
      logger.error('AUTH_REGISTRATION_FAILED', err, { data });
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('wati_jwt');
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
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

  const refreshUser = async () => {
    try {
      const data = await api.get<UserProfile>('/auth/me');
      setUser(data);
    } catch (err) {
      logger.error('AUTH_REFRESH_FAILED', err);
    }
  };

  const is_verified = !!user?.is_verified;

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, updateUserProfile, refreshUser, is_verified }}>
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
