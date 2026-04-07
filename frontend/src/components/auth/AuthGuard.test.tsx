import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { AuthProvider, useAuth } from '../../AuthContext';

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    return <AuthProvider>{children}</AuthProvider>;
};

describe('AuthGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render children when user is authenticated', () => {
        const TestComponent = () => {
            const { user } = useAuth();
            return <div>{user ? 'Authenticated' : 'Not Authenticated'}</div>;
        };

        render(
            <MockAuthProvider>
                <AuthGuard>
                    <TestComponent />
                </AuthGuard>
            </MockAuthProvider>
        );

        expect(screen.getByText('Authenticated')).toBeInTheDocument();
    });

    it('should render null when user is not authenticated and no fallback', () => {
        const TestComponent = () => {
            const { logout } = useAuth();
            return <div onClick={logout}>Logout</div>;
        };

        const { container } = render(
            <MockAuthProvider>
                <AuthGuard>
                    <TestComponent />
                </AuthGuard>
            </MockAuthProvider>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render fallback when user is not authenticated', () => {
        const TestComponent = () => {
            const { logout } = useAuth();
            return <div onClick={logout}>Logout</div>;
        };

        render(
            <MockAuthProvider>
                <AuthGuard fallback={<span>Please login</span>}>
                    <TestComponent />
                </AuthGuard>
            </MockAuthProvider>
        );

        expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    it('should render null by default when no fallback provided', () => {
        const TestComponent = () => {
            const { logout } = useAuth();
            return <div onClick={logout}>Logout</div>;
        };

        const { container } = render(
            <MockAuthProvider>
                <AuthGuard fallback={null}>
                    <TestComponent />
                </AuthGuard>
            </MockAuthProvider>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should handle custom fallback component', () => {
        const TestComponent = () => {
            const { logout } = useAuth();
            return <div onClick={logout}>Logout</div>;
        };

        render(
            <MockAuthProvider>
                <AuthGuard fallback={<div data-testid="fallback">Custom Fallback</div>}>
                    <TestComponent />
                </AuthGuard>
            </MockAuthProvider>
        );

        expect(screen.getByTestId('fallback')).toBeInTheDocument();
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    });
});
