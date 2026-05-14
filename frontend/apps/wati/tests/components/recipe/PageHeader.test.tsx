import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageHeader } from '@wati/src/components/recipe/PageHeader';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
        if (key === 'home.greeting') return `Hola, ${options?.name}`;
        if (key === 'home.searchPlaceholder') return 'Buscar recetas...';
        return key;
    }
  })
}));

// Mock AuthContext
const mockUser = {
  displayName: 'Juan Perez',
  intolerances: [],
  conditions: []
};

vi.mock('@wati/src/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    is_verified: true
  })
}));

// Mock ToastContext
vi.mock('@wati/src/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock AuthGuard to always render children for testing simplicity
vi.mock('@wati/src/components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('PageHeader', () => {
    const defaultProps = {
        searchQuery: '',
        setSearchQuery: vi.fn(),
        isSearchActive: false,
        hasFavorites: false,
        isQuotaExhausted: false,
        showLoader: false,
        isRefreshing: false,
        isSearching: false,
        onRefresh: vi.fn(),
        onOpenLogin: vi.fn()
    };

    it('renders the greeting with the user name', () => {
        render(<PageHeader {...defaultProps} />);
        expect(screen.getByText(/Hola, Juan/i)).toBeInTheDocument();
    });

    it('has a search input with correct label and aria-label', () => {
        render(<PageHeader {...defaultProps} />);
        const input = screen.getByPlaceholderText(/Buscar recetas.../i);
        
        // Check for aria-label (accessibility fix verification)
        expect(input).toHaveAttribute('aria-label', 'Buscar recetas...');
        
        // Check for associated label (accessibility fix verification)
        const label = screen.getByText(/Buscar recetas.../i, { selector: 'label' });
        expect(label).toHaveAttribute('for', 'search-input');
        expect(input).toHaveAttribute('id', 'search-input');
    });

    it('calls setSearchQuery on input change', () => {
        const setSearchQuery = vi.fn();
        render(<PageHeader {...defaultProps} setSearchQuery={setSearchQuery} />);
        
        const input = screen.getByPlaceholderText(/Buscar recetas.../i);
        fireEvent.change(input, { target: { value: 'pasta' } });
        
        expect(setSearchQuery).toHaveBeenCalledWith('pasta');
    });
});
