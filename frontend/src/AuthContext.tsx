import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AuthDB, type UserProfile } from './db/db';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updates: Partial<Pick<UserProfile, 'intolerances' | 'severities' | 'conditions' | 'onboardingComplete' | 'displayName'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = 'sb_session_uid';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedId = localStorage.getItem(SESSION_KEY);
        if (storedId) {
          const profile = await AuthDB.getUser(Number(storedId));
          if (profile) setUser(profile);
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
    const profile = await AuthDB.login(email, password);
    localStorage.setItem(SESSION_KEY, String(profile.id));
    setUser(profile);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const profile = await AuthDB.register(email, password, displayName);
    localStorage.setItem(SESSION_KEY, String(profile.id));
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const updateUserProfile = async (
    updates: Partial<Pick<UserProfile, 'intolerances' | 'severities' | 'conditions' | 'onboardingComplete' | 'displayName'>>
  ) => {
    if (!user?.id) return;
    await AuthDB.updateProfile(user.id, updates);
    const refreshed = await AuthDB.getUser(user.id);
    if (refreshed) setUser(refreshed);
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
