import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecureVault } from './security/SecureVault';
import i18n from './i18n';

export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  diet: string;
  intolerances: string[];
  excluded_ingredients: string;
  daily_calories: number;
  severities: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  conditions: string[];
  onboardingComplete: boolean;
  language?: string;
  savedRecipes?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  register: (email: string, password: string, displayName: string, acceptedTerms: boolean) => Promise<UserProfile | null>;
  logout: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'wati_jwt';
const API_URL = '';

const authHeaders = (): Record<string, string> => {
  return {};
};

function mapProfileData(data: { id: string; email: string; displayName: string; avatarUrl?: string; profile?: Record<string, any> }): UserProfile {
  const { id: _profileId, ...profileWithoutId } = data.profile || {};
  return {
    id: data.id,
    email: data.email,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
    ...(profileWithoutId as any),
    onboardingComplete: data.profile?.onboarding_completed || false
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();

  const { isLoading: isSessionLoading } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      const profile = mapProfileData(data);
      setUser(profile);
      SecureVault.saveProfile(SecureVault.fromUserProfile(profile));
      if (profile.language) {
        i18n.changeLanguage(profile.language);
        localStorage.setItem('wati_language', profile.language);
      }
      return profile;
    },
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      return data;
    },
    onSuccess: async () => {
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        const fullUser = mapProfileData(pData);
        setUser(fullUser);
        SecureVault.saveProfile(SecureVault.fromUserProfile(fullUser));
        if (fullUser.language) {
          i18n.changeLanguage(fullUser.language);
          localStorage.setItem('wati_language', fullUser.language);
        }
        queryClient.setQueryData(['auth', 'session'], fullUser);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, displayName, acceptedTerms }: { email: string; password: string; displayName: string; acceptedTerms: boolean }) => {
      const currentLang = localStorage.getItem('wati_language') || i18n.language?.substring(0, 2) || 'en';
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, acceptedTerms, language: currentLang }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');
      return data;
    },
    onSuccess: async () => {
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        const fullUser = mapProfileData(pData);
        setUser(fullUser);
        SecureVault.saveProfile(SecureVault.fromUserProfile(fullUser));
        queryClient.setQueryData(['auth', 'session'], fullUser);
      }
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const backendUpdates: Record<string, unknown> = { ...updates };
      if (updates.onboardingComplete !== undefined) {
        backendUpdates.onboarding_completed = updates.onboardingComplete;
        delete backendUpdates.onboardingComplete;
      }
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendUpdates),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Error al actualizar el perfil');
      return res.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['auth', 'session'] });
      const previous = queryClient.getQueryData<UserProfile>(['auth', 'session']) ?? null;
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        SecureVault.saveProfile(SecureVault.fromUserProfile(updated));
        return updated;
      });
      return { previous };
    },
    onError: (err, newProfile, context: any) => {
      if (context?.previous) {
        setUser(context.previous);
        queryClient.setQueryData(['auth', 'session'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('[Auth] Error al cerrar sesión en el servidor');
    }
    setUser(null);
    queryClient.setQueryData(['auth', 'session'], null);
    queryClient.clear();
  };

  const login = async (email: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ email, password });
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        return mapProfileData(pData);
      }
      return null;
    } catch (err: any) {
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string, acceptedTerms: boolean) => {
    try {
      await registerMutation.mutateAsync({ email, password, displayName, acceptedTerms });
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        return mapProfileData(pData);
      }
      return null;
    } catch (err: any) {
      throw err;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      await updateProfileMutation.mutateAsync(updates);
    } catch {
      console.error('[Auth] Error al actualizar el perfil');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isSessionLoading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
