import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';
import React from 'react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should render children correctly', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Test Child</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should provide showToast function', () => {
    const { result } = renderHook(() => useToast(), { wrapper: Wrapper });
    expect(typeof result.current.showToast).toBe('function');
  });

  it('should display a toast message when showToast is called', () => {
    const TestComponent = () => {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Test Message', 'success')}>
          Show Toast
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Toast');
    act(() => {
      button.click();
    });

    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('should auto-dismiss the toast after duration', () => {
    const TestComponent = () => {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Auto Dismiss', 'info')}>
          Show
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Show').click();
    });

    expect(screen.getByText('Auto Dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5100); // Default duration is 5000ms
    });

    expect(screen.queryByText('Auto Dismiss')).not.toBeInTheDocument();
  });

  it('should allow manual dismissal', () => {
    const TestComponent = () => {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Manual Dismiss', 'error')}>
          Show
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Show').click();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    act(() => {
      closeButton.click();
    });

    expect(screen.queryByText('Manual Dismiss')).not.toBeInTheDocument();
  });

  it('should support multiple concurrent toasts', () => {
    const TestComponent = () => {
      const { showToast } = useToast();
      return (
        <button onClick={() => {
          showToast('Toast 1', 'info');
          showToast('Toast 2', 'info');
        }}>
          Show Multi
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Show Multi').click();
    });

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });
});
