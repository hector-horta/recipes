import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { SecureVault } from './security/SecureVault';

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
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const fullUserProfile: UserProfile = {
              id: data.id,
              email: data.email,
              displayName: data.displayName,
              avatarUrl: data.avatarUrl,
              ...data.profile,
              onboardingComplete: data.profile.onboarding_completed
            };
            setUser(fullUserProfile);
            // Sync to Vault
            SecureVault.saveProfile(SecureVault.fromUserProfile(fullUserProfile));
          } else {
            localStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (err) {
        console.error('[Auth] Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    
    localStorage.setItem(TOKEN_KEY, data.token);
    
    // Fetch profile to populate full user object
    const profileRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${data.token}` }
    });
    if (profileRes.ok) {
        const pData = await profileRes.json();
        const fullUser: UserProfile = {
            ...pData,
            ...pData.profile,
            onboardingComplete: pData.profile?.onboarding_completed || false
        };
        console.log('[Auth] Login successful. Onboarding status:', fullUser.onboardingComplete);
        setUser(fullUser);
        SecureVault.saveProfile(SecureVault.fromUserProfile(fullUser));
        return fullUser;
    }
    return null;
  };

  const register = async (email: string, password: string, displayName: string, acceptedTerms: boolean) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, acceptedTerms })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');
      
      localStorage.setItem(TOKEN_KEY, data.token);
      
      const profileRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      if (profileRes.ok) {
          const pData = await profileRes.json();
          const fullUser: UserProfile = {
              ...pData,
              ...pData.profile,
              onboardingComplete: pData.profile?.onboarding_completed || false
          };
          console.log('[Auth] Registration successful. Onboarding status:', fullUser.onboardingComplete);
          setUser(fullUser);
          SecureVault.saveProfile(SecureVault.fromUserProfile(fullUser));
          return fullUser;
      }
      return null;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const backendUpdates: any = { ...updates };
    if (updates.onboardingComplete !== undefined) {
      backendUpdates.onboarding_completed = updates.onboardingComplete;
      delete backendUpdates.onboardingComplete;
    }

    const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendUpdates)
    });

    if (!res.ok) {
        console.error('[Auth] Error al actualizar el perfil');
        return;
    }

    // Actualizar el estado local con la respuesta (o simplemente parchear)
    setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        SecureVault.saveProfile(SecureVault.fromUserProfile(updated));
        return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
