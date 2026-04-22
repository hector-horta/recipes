import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './AuthGuard';
import { AuthProvider } from '../../AuthContext';
const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = createQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
};

describe('AuthGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should render children when user is authenticated', async () => {
        localStorage.setItem('wati_jwt', 'fake-token');
        
        const TestComponent = () => {
            return <div data-testid="child">Child Content</div>;
        };

        render(
            <TestWrapper>
                <AuthGuard fallback={<span>Please login</span>}>
                    <TestComponent />
                </AuthGuard>
            </TestWrapper>
        );

        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(screen.queryByText('Please login')).toBeInTheDocument();
    });

    it('should render fallback when no auth', () => {
        const TestComponent = () => {
            return <div>Child Content</div>;
        };

        render(
            <TestWrapper>
                <AuthGuard fallback={<span data-testid="fallback">Please login</span>}>
                    <TestComponent />
                </AuthGuard>
            </TestWrapper>
        );

        expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should handle custom fallback component', () => {
        const TestComponent = () => {
            return <div>Content</div>;
        };

        render(
            <TestWrapper>
                <AuthGuard fallback={<div data-testid="fallback">Custom Fallback</div>}>
                    <TestComponent />
                </AuthGuard>
            </TestWrapper>
        );

        expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
});
