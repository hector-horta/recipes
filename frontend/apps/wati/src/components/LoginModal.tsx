import { X } from 'lucide-react';
import { Button } from '@wati/ui-kit';
import { LoginForm } from './auth/LoginForm';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (userData?: any) => void;
}

export function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brand-forest/85 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-7 border border-white/5 shadow-2xl animate-in glass-organic"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Reusable Login/Register Form */}
        <LoginForm onSuccess={onLoginSuccess} layout="modal" />
      </div>
    </div>
  );
}
