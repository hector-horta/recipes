import { ReactNode } from 'react';
import { useAuth } from '../../AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A Higher-Order Component that restricts access to its children 
 * to users with an active session (logged in).
 * If the user is unauthenticated, the `fallback` UI will be rendered instead.
 */
export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
