import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { VerifyEmailPage } from './VerifyEmailPage';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('VerifyEmailPage', () => {
  const mockRefreshUser = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ refreshUser: mockRefreshUser });
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=test-token',
        href: '',
      },
      writable: true,
    });

    vi.useFakeTimers();
  });

  it('shows loading state initially', async () => {
    (api.post as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<VerifyEmailPage />);
    expect(screen.getByText('auth.verify.verifying_title')).toBeInTheDocument();
  });

  it('shows success state and triggers redirect on successful verification', async () => {
    (api.post as any).mockResolvedValue({ data: { message: 'Verified' } });
    
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('auth.verify.success_title')).toBeInTheDocument();
    });

    expect(mockShowToast).toHaveBeenCalledWith('auth.verify.success_toast', 'success');
    expect(mockRefreshUser).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(window.location.href).toBe('/');
  });

  it('shows error state when token is invalid or expired', async () => {
    (api.post as any).mockRejectedValue({
      response: { data: { message: 'Invalid token' } }
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invalid token')).toBeInTheDocument();
    });
  });

  it('shows error immediately if no token is provided', async () => {
    window.location.search = '';
    render(<VerifyEmailPage />);
    expect(screen.getByText('auth.verify.invalid_link')).toBeInTheDocument();
  });

  it('handles resend verification request', async () => {
    (api.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Link expired' } }
    });
    (api.post as any).mockResolvedValueOnce({ data: { message: 'Sent' } });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('auth.verify.resend_button')).toBeInTheDocument();
    });

    const resendBtn = screen.getByText('auth.verify.resend_button');
    act(() => {
      resendBtn.click();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('auth.verify.resend_success', 'success');
    });
  });
});
