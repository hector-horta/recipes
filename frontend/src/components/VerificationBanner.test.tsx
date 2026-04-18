import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VerificationBanner } from './VerificationBanner';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';

/**
 * @vitest-environment jsdom
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: { post: vi.fn() },
}));

// Use standard buttons to avoid potential issues with custom component mocks
vi.mock('./ui/Button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

describe('VerificationBanner', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    (useAuth as any).mockReturnValue({ 
      user: { email: 'test@example.com' }, 
      is_verified: false 
    });
    
    vi.stubGlobal('location', { pathname: '/' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders correctly for unverified users', async () => {
    render(<VerificationBanner />);
    expect(screen.getByText('verificationBanner.title')).toBeInTheDocument();
  });

  it('does not render when user is verified', async () => {
    (useAuth as any).mockReturnValue({ user: { email: 'test@example.com' }, is_verified: true });
    render(<VerificationBanner />);
    expect(screen.queryByText('verificationBanner.title')).not.toBeInTheDocument();
  });

  it('handles resend and countdown', async () => {
    (api.post as any).mockResolvedValue({ data: { message: 'Sent' } });
    
    render(<VerificationBanner />);
    
    const resendBtn = screen.getByText('verificationBanner.button');
    
    // Trigger resend
    fireEvent.click(resendBtn);

    // Resolve the API call
    await act(async () => {
      await Promise.resolve(); // Flush microtasks
    });

    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification');
    expect(mockShowToast).toHaveBeenCalledWith('verificationBanner.sent', 'success');

    // Verify countdown starts at 2s (test env default)
    expect(screen.getByText(/2s/)).toBeInTheDocument();

    // Advance 1s
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/1s/)).toBeInTheDocument();

    // Advance 1s more
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should go back to button text
    expect(screen.getByText('verificationBanner.button')).toBeInTheDocument();
  }, 10000);

  it('hides when closed', async () => {
    await act(async () => {
      render(<VerificationBanner />);
    });
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('verificationBanner.title')).not.toBeInTheDocument();
  });
});
