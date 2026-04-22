import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordPage } from './ResetPasswordPage';
import { useToast } from '../ToastContext';
import { api } from '../lib/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('ResetPasswordPage', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '?token=reset-token',
        href: '',
      },
      writable: true,
    });
  });

  it('renders reset password form when token is present', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText('auth.reset.title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows error if passwords do not match', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitBtn = screen.getByText('auth.reset.submit_button');

    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Mismatch123' } });
    fireEvent.click(submitBtn);

    expect(mockShowToast).toHaveBeenCalledWith('auth.reset.mismatch', 'error');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows error if password is too short', async () => {
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitBtn = screen.getByText('auth.reset.submit_button');

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    expect(mockShowToast).toHaveBeenCalledWith('auth.reset.too_short', 'error');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('successfully resets password', async () => {
    (api.post as any).mockResolvedValue({ data: { message: 'Success' } });
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmInput = screen.getAllByPlaceholderText('••••••••')[1];
    const submitBtn = screen.getByText('auth.reset.submit_button');

    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'NewPassword123'
      });
      expect(screen.getByText('auth.reset.success_title')).toBeInTheDocument();
    });
  });

  it('shows error view if no token is provided', () => {
    window.location.search = '';
    render(<ResetPasswordPage />);
    expect(screen.getByText('auth.reset.invalid_link_title')).toBeInTheDocument();
  });

  it('redirects to login with param on success button click', async () => {
    (api.post as any).mockResolvedValue({ data: { message: 'Success' } });
    render(<ResetPasswordPage />);
    
    const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
    const confirmInput = screen.getAllByPlaceholderText('••••••••')[1];
    fireEvent.change(passwordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'NewPassword123' } });
    fireEvent.click(screen.getByText('auth.reset.submit_button'));

    await waitFor(() => {
      const loginBtn = screen.getByText('auth.reset.go_to_login');
      fireEvent.click(loginBtn);
      expect(window.location.href).toBe('/?login=true');
    });
  });
});
