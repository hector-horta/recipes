import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingModal } from './OnboardingModal';
import { AuthProvider } from '../AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
        const translations: Record<string, string> = {
            'onboarding.whatToProtect': 'Personaliza tu experiencia',
            'common.saveAndContinue': 'Guardar y Continuar',
            'common.errorPersistence': 'Ocurrió un error al guardar tu perfil',
            'intolerances.gluten': 'Gluten',
            'intolerances.sibo': 'SIBO',
            'common.next': 'Siguiente'
        };
        return translations[key] || key;
    }
  })
}));

// Mock the AuthContext values
const mockUpdateProfile = vi.fn();
const mockUser = {
  id: 'user-1',
  displayName: 'Test User',
  email: 'test@example.com',
  intolerances: [],
  conditions: [],
  severities: {}
};

vi.mock('../AuthContext', async () => {
    const actual: any = await vi.importActual('../AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            user: mockUser,
            updateProfile: mockUpdateProfile,
            isLoading: false
        })
    };
});

// Mock the api client from ../lib/api
vi.mock('../lib/api', () => ({
    api: {
        get: vi.fn().mockResolvedValue([
            { id: 'gluten', label: 'Gluten', emoji: '🌾', desc: 'Trigo y derivados' },
            { id: 'sibo', label: 'SIBO', emoji: '🦠', desc: 'Sobrecrecimiento bacteriano' }
        ])
    }
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const renderOnboarding = () => {
    return render(
        <QueryClientProvider client={queryClient}>
            <OnboardingModal isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>
    );
};

describe('OnboardingModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the modal title', () => {
        renderOnboarding();
        expect(screen.getByText(/Personaliza tu experiencia/i)).toBeInTheDocument();
    });

    it('shows intolerance items', async () => {
        renderOnboarding();
        // Wait for catalog to load and find Gluten
        const glutenButton = await screen.findByText('Gluten', {}, { timeout: 3000 });
        expect(glutenButton).toBeInTheDocument();
        
        // Find SIBO button
        const siboButton = screen.getByText('SIBO');
        expect(siboButton).toBeInTheDocument();
    });

    it('toggles an intolerance', async () => {
        renderOnboarding();
        const glutenButton = await screen.findByText('Gluten', {}, { timeout: 3000 });
        fireEvent.click(glutenButton);
        // Expect click logic was handled (it doesn't throw)
    });

    it('syncs SIBO condition when sibo intolerance is selected', async () => {
        renderOnboarding();
        const siboButton = await screen.findByText('SIBO', {}, { timeout: 3000 });
        fireEvent.click(siboButton);
        
        const nextButton = screen.getByText(/Siguiente/i);
        fireEvent.click(nextButton);

        const saveButton = await screen.findByText(/Guardar y Continuar/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
                intolerances: ['sibo'],
                conditions: ['SIBO'],
                severities: { sibo: 'moderate' }
            }));
        });
    });

    it('shows error if updateProfile fails', async () => {
        mockUpdateProfile.mockRejectedValue(new Error('Update failed'));
        renderOnboarding();
        
        const siboButton = await screen.findByText('SIBO', {}, { timeout: 3000 });
        fireEvent.click(siboButton);
        
        const nextButton = screen.getByText(/Siguiente/i);
        fireEvent.click(nextButton);

        const saveButton = await screen.findByText(/Guardar y Continuar/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/Ocurrió un error al guardar tu perfil/i)).toBeInTheDocument();
        });
    });
});
